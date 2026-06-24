---
uid: request-770f9a63
id: REQ-20
type: request
title: Web fetch safety contract + R2 assets bucket binding and HTTP surface
created_by: xgd
created_at: '2026-06-16T23:23:43.955192+00:00'
updated_at: '2026-06-19T01:17:40.169010+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  priority: high
  story_points: 7
  auto_merge_back: true
  needs_review: false
  commits:
  - 212b974faed14287989899e9c83f0ad903506325
---

## Problem

The platform is about to add external-website fetching capabilities (Reference Digest production, Browser Rendering, asset downloads, search-result expansion). Every fetch path needs to share a single safety layer or each consumer REQ re-implements it differently. SSRF (private-IP, `file://`, cloud-metadata endpoints), redirect loops, oversize bodies, robots.txt, per-account rate limiting, and Browser Rendering compute-time budget are foundation that **every** external-fetch tool must go through — no exceptions, no per-tool variants.

This REQ also lands the **R2 assets bucket binding and CRUD surface**. The binding and its HTTP routes are foundation plumbing that several downstream REQs depend on (REQ-22 writes screenshots to R2; REQ-21 may persist fetched asset bodies; REQ-16 mounts an editor UI on top of the routes). Originally scoped inside [[REQ-16]]; moved here so the demo-critical-path REQs (REQ-21, REQ-22, REQ-28) can land without dragging the full assets-tab UI along.

Per [[DOC-9]] §11 the fetch safety baseline is non-negotiable; this REQ delivers it alongside the asset-storage plumbing.

## Scope

Two pieces of platform plumbing:

1. **Safety layer** — `packages/web-fetch-safety` plus Worker-side middleware. After this REQ: any AI tool that fetches an external URL goes through the same SSRF check, redirect cap, size cap, robots-respect, rate-limit budget, and (for Browser Rendering) compute-time budget. No fetch path may bypass this layer.
2. **R2 assets bucket** — `ASSETS_BUCKET` binding on the control-app Worker plus the four CRUD routes (list / get / put / delete). Used by downstream REQs for screenshot storage, asset persistence, and (later) the assets-tab editor UI.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 1, 2, 4, 7 inline:

- **Per-account rate limits**: 20 fetches per rolling hour; 100 per rolling day; burst tolerance of 10 fetches per any 60-second sliding window. All three windows enforced together; first hit returns `429 rate_limited` with a `retry_after_seconds` field. Counters live in KV keyed by `account_id`.
- **Browser Rendering budget**: 50 browser-seconds per chat session; 200 browser-seconds per account per UTC day. Tracked separately from the fetch counters above. On exhaustion the consumer receives a typed `budget_exhausted` result; consumers degrade gracefully (REQ C falls back to static fetch).
- **Cache layer**: Per-URL response cache in KV, 1-hour TTL, keyed by `sha256(method|url|range)`. Cross-session reuse is allowed; same URL fetched twice within an hour returns the cached body. Transcription results are explicitly **not** cached (one-shot per draft).
- **Redirect cap**: Maximum 5 redirects. Each target re-validated through SSRF + scheme + size checks before being followed.
- **Size cap**: 5 MB hard cap on response body. Connection aborted at the cap; no partial body returned to consumers. Browser Rendering screenshots are not subject to this body cap (they are not response bodies).
- **Robots.txt UX**: When robots.txt forbids the target, the safety layer returns a typed `requires_robots_override` error. The consuming AI tool surfaces a single-action confirmation to the operator: "robots.txt for example.com asks crawlers to stay out. If you own this site, confirm to proceed." On confirmation the origin is flagged in the chat metadata `robotsOverrides: ["example.com"]`. The flag is **per-chat, per-origin** — there is no global "ignore robots" toggle and no per-account override that persists across chats.
- **SSRF blocklist**: RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`), cloud metadata (`169.254.169.254`, AWS/GCP/Azure metadata DNS names), and the broadcast / unspecified ranges. Resolved at fetch time, re-checked on every redirect.
- **Scheme allowlist**: `https` only. `http` is allowed **only** when the operator was previously served an HTTPS URL on the same origin in the same chat session and the HTTP target is the same origin. No `file://`, `gopher://`, `data:`, or anything else.
- **AI may not fetch on its own initiative**: the safety layer enforces an `operator_intent_token` requirement on every call. Tokens are minted by the AI tool dispatcher when the operator's preceding message contains a URL or explicit fetch request, and they expire after 60 seconds. This closes [[CHAT-13]] turn 1's "should the AI fetch on its own initiative" question with **no**: every external fetch must trace to a recent operator intent.
- **R2 assets bucket name**: `ASSETS_BUCKET`. Wrangler emulates R2 locally in dev (state in `.wrangler/state/`); production binds to the real bucket. Single bucket for v1 — per-customer-site isolation deferred until auth lands.

## Design conversation

Full thread for the safety layer: [[CHAT-13]]. Most relevant operator framing:

> "I see several use cases for having our AI be able to access websites: User has an existing site they want to convert to 1st contact and update; User wants a site that looks a bit like <competitor> or <adjacency>; User has links to assets for the site."
> — [[CHAT-13]] turn 1

> "We will need to close any open design questions as you go. You cannot leave design questions open in an REQ."
> — operator framing for this batch of REQs

R2 plumbing rationale moved here in 2026-06-18 planning chat: the demo critical path (REQ-21 → REQ-22 → REQ-28) needs the bucket binding and `GET /assets/<key>` route, but does not need the assets-tab UI. Folding the binding + CRUD here lets REQ-16 stay UI-only.

## IN

### `packages/web-fetch-safety` (new package)

- `validateTarget(url)` — SSRF + scheme + blocklist check. Returns `{ ok: true, ip, scheme }` or `{ ok: false, reason }` with a typed reason enum (`private_ip`, `loopback`, `metadata_host`, `disallowed_scheme`, `unresolved`).
- `safeFetch(request, ctx)` — wraps Worker `fetch` with: `validateTarget` on the URL and on every redirect target; 5-redirect cap; 5 MB body cap; abort on cap; surface a typed error otherwise.
- `RobotsTxtCache` — fetches `/robots.txt` lazily per origin; cached in KV for 24 hours; returns `{ allowed: boolean, group_matched: string }`. The cache wrapper handles the operator override path by checking the chat metadata for `robotsOverrides`.
- Type definitions for every typed error and success shape.

### `apps/control-app` middleware (safety)

- `withFetchSafety(handler)` — middleware applied to every Worker route that performs external fetches. Verifies the request carries a current `operator_intent_token`; rejects with `401 missing_intent` if not.
- Rate-limit middleware that increments and checks the three KV-backed windows (hour / day / burst). Wraps `withFetchSafety`.
- Browser Rendering budget middleware (used only by REQ C) that decrements the per-session and per-day budgets; rejects with `budget_exhausted` when either is empty.
- Operator-intent-token minting hook on the AI tool dispatcher: when the operator's preceding message contains a URL or an explicit fetch directive, a 60-second token is added to the next AI turn's tool context. Tokens are scoped to that chat session.

### `apps/control-app` routes (R2 assets bucket)

- `GET /api/assets/list` → JSON `{items: [{key, size, etag, uploaded, contentType}]}`.
- `GET /assets/<key>` → object body, preserving original content-type. Also serves AssetRefs for customer sites later.
- `PUT /api/assets/put/<key>` → upload/overwrite. Body = raw file bytes; uses `Content-Type` header. Optional `If-Match: <etag>` for concurrency.
- `DELETE /api/assets/delete/<key>` → remove object.

These routes are unauthenticated stubs in v1 (single-operator assumption matches the rest of the control-app). Auth will be added in a later REQ.

### Wiring

- `apps/control-app/wrangler.toml` adds KV bindings: `FETCH_RATE_KV`, `FETCH_CACHE_KV`, `FETCH_ROBOTS_KV`, `BROWSER_BUDGET_KV`. Same shape under `[env.production]`.
- `apps/control-app/wrangler.toml` adds `[[r2_buckets]]` binding `ASSETS_BUCKET`. Same shape under `[env.production]`.
- A health endpoint `GET /api/_safety/health` returns the current rate-limit windows for the calling account (for the builder's diagnostic surface, hidden from production UI).

## OUT (explicitly deferred)

- The fetch tools themselves (REQ B and REQ C).
- The Browser Rendering Worker binding configuration (REQ C handles this; this REQ only provides the budget middleware shape).
- The search-references tool (REQ F).
- A configurable rate-limit policy per account tier — single set of limits in v1.
- An operator-facing "fetch history" panel — limits are introspectable via the AI's `tool_result` but no UI surface.
- **Assets-tab UI** — file list, splitter, TipTap editor, image preview. Lives in [[REQ-16]] which now depends on this REQ for the bucket binding and routes.
- **Per-customer-site asset isolation** (multi-tenancy on the bucket) — assume single site for v1; revisit when auth lands.
- **Asset DELETE soft-blocks** based on revision references — that policy belongs in [[REQ-18]] (publish + revisions).

## Dependencies

- [[REQ-1]] — Worker monorepo scaffold.
- [[REQ-9]] — Operator API namespace (for middleware registration).
- [[DOC-5]] §6 — KV caching policy.
- [[DOC-9]] §11 — safety contract architectural commitment.

## Acceptance criteria

### Safety layer

1. `validateTarget("https://192.168.0.1/x")` returns `{ ok: false, reason: "private_ip" }`. Same for `127.0.0.1`, `169.254.169.254`, `localhost`, IPv6 loopback `::1`, link-local `fe80::1`.
2. `validateTarget("file:///etc/passwd")` returns `{ ok: false, reason: "disallowed_scheme" }`. Same for `gopher://`, `data:`, `ftp://`.
3. `safeFetch` against a URL that 301-redirects to `http://127.0.0.1/` rejects on the second hop with `private_ip`, not on the first hop.
4. `safeFetch` against a 10 MB response aborts at the 5 MB boundary and returns `{ ok: false, reason: "body_too_large" }`. No partial body is returned to the caller.
5. `safeFetch` follows up to 5 redirects; the 6th returns `{ ok: false, reason: "too_many_redirects" }`.
6. Fetching `https://example.com/x` twice within 1 hour: second call is served from KV cache; second call's `Cf-Cache-Status` (or equivalent custom header) reads `HIT`.
7. With the rate-limit middleware engaged, a single account making 21 fetches in one rolling hour: calls 1–20 succeed; call 21 returns `429` with a `retry_after_seconds` between 1 and 3600.
8. With the burst limiter engaged, 11 fetches in 60 seconds returns `429` on the 11th regardless of the hourly budget.
9. Browser-rendering budget: after 50 browser-seconds in one chat session, the 51st request returns `budget_exhausted` with a typed reason and the session-budget counter at 0.
10. `RobotsTxtCache.check("https://example.com/x")` against a robots.txt that disallows `*`: returns `{ allowed: false }`. After the chat metadata records `robotsOverrides: ["example.com"]`, the next call returns `{ allowed: true }` and the override is scoped to that chat only — a sibling chat's call returns `{ allowed: false }`.
11. The AI tool dispatcher refuses to invoke a fetch-marked tool when the current turn's context has no operator-intent token; the AI receives a typed `missing_intent` error and can prompt the operator.
12. Operator-intent-token expires after 60 seconds; an AI tool call attempting to reuse a token from a previous turn returns `missing_intent`.

### R2 assets bucket

13. `PUT /api/assets/put/foo.png` with `Content-Type: image/png` and a PNG body writes the object; subsequent `GET /assets/foo.png` returns the same bytes with `Content-Type: image/png`.
14. `GET /api/assets/list` returns a JSON list including every object previously PUT, with `key`, `size`, `etag`, `uploaded`, and `contentType` populated.
15. `PUT` with a stale `If-Match: <wrong-etag>` returns `412 precondition_failed` and does not overwrite. PUT with matching `If-Match` succeeds and bumps the etag.
16. `DELETE /api/assets/delete/foo.png` removes the object; subsequent `GET /assets/foo.png` returns `404`.
17. Wrangler dev surface emulates R2 locally — all of the above pass against `wrangler dev` with no real R2 bucket.

## Story points

7. Safety layer + middleware + R2 binding + 4 routes + KV/R2 wiring + acceptance coverage across both halves. (Was 5 before the R2 plumbing moved over from REQ-16.)

## Test plan (UAT-primary)

Tests named `test_UAT_FC_<TICKET-ID>_*.ts`, under `tests/`. Stack: vitest + Miniflare (matches existing `vitest.config.mts`). R2 binding tested via Miniflare's local R2 emulator; KV bindings the same.

Safety-layer UATs (one per acceptance criterion 1–12, grouped where shared setup permits):
- `test_UAT_FC_<TICKET-ID>_ssrf_blocks.ts` — covers criteria 1–3.
- `test_UAT_FC_<TICKET-ID>_size_redirect_caps.ts` — covers 4–5.
- `test_UAT_FC_<TICKET-ID>_cache.ts` — covers 6.
- `test_UAT_FC_<TICKET-ID>_rate_limits.ts` — covers 7–8.
- `test_UAT_FC_<TICKET-ID>_browser_budget.ts` — covers 9.
- `test_UAT_FC_<TICKET-ID>_robots_override.ts` — covers 10.
- `test_UAT_FC_<TICKET-ID>_intent_token.ts` — covers 11–12.

R2-assets UATs (covering criteria 13–17):
- `test_UAT_FC_<TICKET-ID>_assets_put_get.ts` — covers 13.
- `test_UAT_FC_<TICKET-ID>_assets_list.ts` — covers 14.
- `test_UAT_FC_<TICKET-ID>_assets_etag.ts` — covers 15.
- `test_UAT_FC_<TICKET-ID>_assets_delete.ts` — covers 16.
- `test_UAT_FC_<TICKET-ID>_assets_wrangler_dev.ts` — covers 17.

## Notes

This REQ ships no operator-visible UI directly. Its effect is observable through the tool_result shapes that REQs B, C, E, F surface, the rate-limit / budget messages the AI receives, and the asset-storage HTTP surface that REQ-16 mounts an editor on top of.