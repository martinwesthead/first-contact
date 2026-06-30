---
uid: story-a0482aed
id: STORY-53
type: story
title: External fetch safety contract
created_by: xgd
created_at: '2026-06-27T00:33:03.009061+00:00'
updated_at: '2026-06-30T06:34:45.745477+00:00'
completed_at: null
last_field_updated: status
status: updated
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-f446e94d
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-4e8020d6
---

## Story

As an operator using AI tools that may need to fetch external URLs on my behalf, I want every external fetch performed by the platform to flow through a single, uniform safety contract — SSRF blocking, scheme restriction, redirect/size caps, response caching, robots.txt respect with explicit per-chat override, per-account rate limits, browser-compute budget, and operator-intent gating — so that no AI tool can exfiltrate to internal hosts, abuse third-party origins, ignore robots directives, or fetch on its own initiative without traceable operator intent.

## Description

A platform-wide safety contract enforced on every external URL fetch performed by any operator action. The contract is foundation infrastructure: it does not surface its own operator UI, but its effects are observable through the typed error shapes that downstream operator actions return when the contract rejects a fetch, through robots.txt override prompts that downstream actions surface, and through a diagnostic endpoint that reports the calling account's current rate-limit state.

In scope:
- SSRF blocklist across IPv4 and IPv6 (RFC1918, loopback, link-local, cloud metadata, broadcast, unspecified)
- Scheme allowlist (https always; http only on operator-approved same-origin within the same chat session)
- Manual redirect handling with per-hop re-validation, 5-redirect cap
- Body size cap (5 MB) with mid-stream abort; no partial body returned
- KV-backed response cache (1-hour TTL, keyed by method + URL + range)
- robots.txt rules with longest-match precedence; per-chat operator override list (no global ignore, no per-account persistent override)
- Per-account rate limits: 20/hour, 100/day, 10-per-60s burst — first hit returns typed `rate_limited` with `retryAfterSeconds`
- Browser-rendering compute budget: the per-call cap is configurable, but the DEFAULT is effectively infinite — `1e9` seconds for both the per-chat-session and per-account-day windows — so the cap never fires for production callers using defaults. A finite session/day ceiling is enforced only when an explicit per-call config override is supplied; exhaustion then returns typed `budget_exhausted`. The enforcement machinery (KV counters, `BROWSER_BUDGET_KV` binding, per-call config override) is unchanged.
- 60-second one-shot operator-intent tokens; chat dispatcher infers intent from operator messages containing a URL or a fetch-related keyword
- Diagnostic `GET /api/_safety/health` endpoint reporting the calling account's rate-limit window state
- Package consumption hygiene: the `@1stcontact/web-fetch-safety` library is self-contained at the type level — a downstream package that imports it compiles under `pnpm build` without having to declare `@cloudflare/workers-types` in its own tsconfig

Out of scope:
- The consuming operator actions themselves (each action REQ owns its own user-facing behavior)
- Per-account-tier rate-limit policies (single set of limits in v1)
- An operator-facing fetch history UI
- The R2 assets bucket (separate story)
- Real authentication backing the `account_id` (currently stub header)

## Technical Context

Implemented as `packages/web-fetch-safety` (a pure library exporting `validateTarget`, `safeFetch`, `RobotsTxtCache`, `checkRateLimit` + `getRateLimitState`, `checkBrowserBudget` + `chargeBrowserBudget`, `mintIntentToken` + `verifyIntentToken`, `operatorMessageImpliesIntent`) plus `apps/control-app/src/safety/{health,account}.ts` for the Worker surface. Persistence uses four KV bindings — `FETCH_RATE_KV` (rate-limit windows + intent tokens), `FETCH_CACHE_KV` (response cache), `FETCH_ROBOTS_KV` (parsed robots rules), `BROWSER_BUDGET_KV` (browser-rendering counters) — registered in `apps/control-app/wrangler.toml` under both default and `[env.production]`.

Per CHAT-13 turn 1 and DOC-9 §11 the safety contract is a non-negotiable architectural commitment. The "no AI fetch on its own initiative" decision is enforced by the operator-intent token requirement.

`DEFAULT_BROWSER_BUDGET` is `{ sessionMaxSeconds: 1_000_000_000, dayMaxSeconds: 1_000_000_000 }` (BUG-17). The original `{50s session, 200s day}` ceilings were raised to effectively infinite because the cap was tripping during normal test/dev flows where a single session accumulates seconds across many calls, leaving only static signals with no screenshots. The budget infrastructure is deliberately preserved: `checkBrowserBudget` / `chargeBrowserBudget` still merge a caller-supplied `config: { sessionMaxSeconds, dayMaxSeconds }` over the defaults, so re-tightening is a one-constant edit or a per-call override. Runaway browser-compute cost is still bounded by the separate `FETCH_RATE_KV` rate limiter. Tests exercise the cap mechanism by passing an explicit small `config` rather than relying on the (now huge) defaults.

The `account_id` used as the rate-limit and budget key is currently sourced from a stub `x-account-id` request header (defaulting to `"anonymous"`). REQ-10 (accounts + auth) will replace the resolver without changing the safety contract or KV key shape — existing default-keyed counters age out via TTL.

The four library sources that touch KV (`browser-budget.ts`, `intent-token.ts`, `rate-limit.ts`, `types.ts`) reference `KVNamespace` via an `import type { KVNamespace } from "@cloudflare/workers-types"` rather than relying on it as a bare ambient global. This is a type-only import with zero runtime impact; it stops the package from leaking a `@cloudflare/workers-types` requirement onto consumers. Without it, any consumer whose tsconfig omits `@cloudflare/workers-types` from its `types[]` array (e.g. `packages/extractor`) failed `pnpm build` with nine `TS2304: Cannot find name 'KVNamespace'` errors. This was a pre-existing leak (reproduces under both old and new workers-types versions), not a consequence of the wrangler 4 bump.

The first consumer is the `analyze_page` operator action (plan item 7 of this bundle). Future consumers include Browser Rendering (REQ-22), transcription (REQ-28), and search-references (REQ-29).

Note: REQ-20's spec calls for the rate-limit and browser-budget enforcement to be wired through Worker middleware that wraps fetch-performing routes. The current implementation ships the safety primitives as library functions plus a diagnostic health endpoint; downstream operator actions are expected to call the library checks directly from their handlers. Regression should surface any safety bypass at a fetch path that doesn't go through these calls.

## Dependencies

- Plan item 1 (Operator API foundation): the safety contract is invoked from operator action handlers that route through `/api/operator/*`.

## Story Points

3