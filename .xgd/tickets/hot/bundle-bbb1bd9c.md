---
uid: bundle-bbb1bd9c
id: BUNDLE-3
type: bundle
title: REQ-9 + REQ-20 + REQ-13 + REQ-21
created_by: xgd
created_at: '2026-06-25T02:41:17.041684+00:00'
updated_at: '2026-06-25T02:41:18.509661+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  commits:
  - 2a774df5356e19c46a16fab8483e8fd177f38570
  - 212b974faed14287989899e9c83f0ad903506325
  - 8628a0a8ea863795e3c285088b03eac5fc5912b6
  - e4ac8800875ff8861c8a0bb029f77ba846fbefd1
  auto_merge_back: true
  priority: medium
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-9: Operator API foundation: /api/operator namespace + SSE event registry + system-action framework + plan-tier authorization

## Scope

Establish the **Operator API** as a first-class architectural surface: the `/api/operator/*` namespace, the SSE event-type registry, the server-side tool-execution framework for system actions, and the plan-tier authorization middleware that enforces parity between UI affordances and AI tool exposure.

After this REQ: every operator-level action — present and future — is routed through one auth-scoped, plan-tier-gated namespace. The SSE channel from [[REQ-8]] is extended to multiplex action notifications and structured errors alongside chat and state-edit events. The AI tool list available in any given session reflects exactly what the operator is permitted to do (no tool exposed for an action the operator cannot perform via UI).

Design discussion: see [[DOC-5]] (forthcoming amendment: Operator API principle) and [[DOC-8]] §5 (tool surface). This REQ is the architectural counterpart to [[REQ-8]]: REQ-8 shipped the chat + state-edit loop; this REQ formalizes the broader API surface that all subsequent operator actions consume.

## Why free-coded

Foundational architecture commitment, narrow specification surface: namespace conventions, channel event types, middleware. No algorithmic design. The principle is settled (Operator API parity); what remains is naming, routing, and a tool-execution framework that subsequent action REQs plug into.

## Dependencies

- [[REQ-8]] — chat session + SSE channel + state-edit tool execution already in place.
- Auth: REQ-8 currently runs without auth. This REQ adds a stub auth boundary (session header carries `account_id` + `plan_tier`; defaults to a fixed trial-plan stub when unset). A real magic-link auth REQ is a prerequisite for the next lifecycle work but does not block this REQ.

## Architectural principle (recorded for the matrix)

> **Operator API parity.** Every operator-action AC specifies both the UI affordance and the AI tool. A REQ that adds a new operator action is not considered complete until both surfaces ship. The AI tool list available in a session is exactly the set of operator actions the operator is permitted to perform; the AI cannot see tools for actions the operator cannot perform via UI.

This principle is enforced by:
1. Tool list construction on the Worker side filters by `(action.plan_tier ≤ session.plan_tier)`.
2. Every operator-action REQ's ACs cover both API behaviour and UI behaviour, or pair an API REQ with a UI REQ.

## Deliverables

### `apps/control-app` Worker — `/api/operator/*` namespace

- Establish convention: all operator actions live at `/api/operator/<action_name>`.
- Each action is a typed handler with: input schema, plan-tier requirement, side-effect description, structured result.
- Action registry: a single `OPERATOR_ACTIONS` map listing every action name + handler + plan-tier + tool-spec (for AI exposure). Single source of truth.
- Routing: incoming requests to `/api/operator/<name>` dispatch through the registry; unknown names return 404; unauthorized plan tier returns 403.

### SSE channel — event-type registry

Extends the channel from REQ-8 with the full event-type set:

- `chat:append` (existing) — assistant message tokens.
- `state:diff` (existing) — state-edit tool call to apply locally.
- `state:invalidate` (new) — server-side state changed; FE should refetch (e.g. after a publish or rollback).
- `action:notify` (new) — system-action result: `{action, status, payload}`. Examples: published, rolled-back, renamed.
- `validation:error` (new, formalized) — validator rejected a tool call; structured error for display + AI self-correction.

A single SSE endpoint per session multiplexes all event types. Client-side dispatcher routes by `event` field.

### Server-side tool-execution framework

For **system actions** (Category 2 per DOC-8 §5):

- AI emits a tool call via Anthropic's tool-use mechanism.
- Worker matches the tool name against `OPERATOR_ACTIONS`.
- If the operator's `plan_tier` permits the action, execute it (write to D1, trigger build, etc.); on success, emit `action:notify` event with the result; on failure, emit `validation:error` or `action:notify` with `status: 'failed'`.
- If the operator's `plan_tier` does **not** permit the action, the tool should not have been exposed to the AI in the first place — this branch is a defensive-only 403.

For **state edits** (Category 1, already in REQ-8): unchanged. Stream tool calls to FE via `state:diff` for client-side validator + state update.

### Plan-tier authorization middleware

- Every `/api/operator/*` request passes through middleware that extracts `session → account → plan_tier`.
- Action handlers receive `plan_tier` and may reject (`403` for permission denial; `409` for state-precondition denial).
- AI tool-list construction filters the available tools by plan tier before sending to Anthropic.
- For unauthenticated sessions in v1: stub returns `plan_tier: 'trial'`. No system actions available on trial. State edits remain available (per REQ-8's behaviour).

### Parity invariant scaffolding

- Each entry in `OPERATOR_ACTIONS` MUST include:
  - `tool_spec` — Anthropic tool definition consumed by `/api/chat`
  - `ui_route` — string identifying where the action surfaces in the UI (or `null` if explicitly chat-only)
- A `tools/parity-audit.ts` script lists actions whose `ui_route` is unimplemented (future-proofing for CI matrix audits).

## UATs (`test_UAT_FC_<REQ-ID>_*`)

- `unknown_operator_action_returns_404` — `POST /api/operator/nonexistent` returns 404.
- `trial_plan_cannot_invoke_publish_stub` — call to a registered action gated `plan_tier='paid'` with a trial session returns 403.
- `tool_list_filters_by_plan_tier` — `/api/chat` system prompt only includes tool specs for actions the session's plan_tier permits.
- `sse_emits_action_notify_event` — a stub action handler emitting an event causes the SSE channel to deliver an `action:notify` event to the client within 100ms.
- `validation_error_event_format` — a state-edit tool call rejected by the validator surfaces as a `validation:error` event with `{path, expected, got}`.

## Out of scope

- Specific lifecycle actions (publish, rollback, revisions) — REQ-11.
- D1 schema for sites / drafts / revisions / accounts — REQ-10.
- UI consumers — REQ-12.
- Magic-link authentication — separate REQ.
- Operator CLI — explicitly deferred per CHAT-9 discussion ("not yet").
- Audit logging of system actions — later.

## Risks / open items

- **Anthropic tool list serialization size** — if `OPERATOR_ACTIONS` grows to dozens of system actions, the system prompt's tool definitions could approach token-budget limits. Acceptable for v1 (single-digit system actions expected). Add a guard that logs warning if the serialized tool spec exceeds 8K tokens.
- **Defensive plan-tier check inside handlers** — even though the tool list filters by plan tier, handlers should still verify; defense in depth against client tampering or future auth bugs.



## Scope decisions (2026-06-17, locked at start of free-coding session)

The original body was written assuming REQ-8 shipped an SSE channel. It did not — REQ-8's `/api/chat` is a synchronous POST returning `{text, toolCalls}`. The phrasing "extends the channel from REQ-8" is therefore reinterpreted as **"introduces in this REQ"** for the deliverables below. The three new event types (`state:invalidate`, `action:notify`, `validation:error`) are inherently asynchronous and cannot land without SSE; deferring SSE again would force their semantics into a poll-and-pretend shape that contradicts the operator API principle.

### Decision 1 — SSE introduction is in REQ-9 scope (not a prerequisite)

- New endpoint: `GET /api/operator/events?session_id=<id>` opens an event-stream-encoded multiplexed channel.
- All five event types listed in the SSE section ship in this REQ.
- Chat responses continue to return `{text, toolCalls}` as a *synchronous* fallback for v1; `chat:append` over SSE is wired in but only fires when chat is invoked alongside an open SSE session (the FE migration to streaming chat is REQ-12 territory).
- Heartbeat every 15s. Channel closes cleanly on client disconnect.
- Story-points realism: bumped in spirit to ~6 (not editing frontmatter mid-flight; logging here for matrix).

### Decision 2 — Auth stub uses headers, not cookies

- Worker reads `x-account-id` and `x-plan-tier` from incoming requests.
- Defaults when absent: `account_id = "anonymous"`, `plan_tier = "trial"`.
- Trial tier sees state-edit tools but no system-action tools (publish/rollback stubs).
- Cookies / magic-link are a future REQ and will replace the header source without changing the registry contract.

### Decision 3 — `OPERATOR_ACTIONS` registry is the single source of truth, including state-edit tools

- REQ-8's eight state-edit tool definitions (`set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`) move into `OPERATOR_ACTIONS` with `plan_tier: 'trial'` (available to all sessions), `category: 'state_edit'`, and `ui_route: null` (chat-driven only for now; UI affordances ship in their own REQs).
- The `TOOL_DEFINITIONS` constant in `chat.ts` is removed; `/api/chat` now derives its tool list from `OPERATOR_ACTIONS` filtered by session plan tier.
- State-edit tools' execution semantics are **unchanged** from REQ-8: they remain Category-1 (streamed to FE for client-side validator + application). System actions are Category-2 (executed server-side, result emitted via `action:notify`). The `category` field on each registry entry disambiguates.
- This resolves the "grandfathered" / "single source of truth" contradiction in the original body in favor of SSOT.


---

## REQ-20: Web fetch safety contract + R2 assets bucket binding and HTTP surface

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


---

## REQ-13: AI state visibility + chat markdown rendering: structured tool_results, get_site_definition read tool, marked output, TipTap input

## Scope

Three coupled improvements to the chat-driven builder experience:

1. **AI state visibility** — give the AI a reliable view of the post-edit site state. Today the AI sees only the original site definition and infers downstream state from its own emitted tool calls, leading to drift when calls partially fail or behave unexpectedly.
2. **Chat markdown rendering** — assistant messages currently render as raw markdown text; user paste into the chat input does not render markdown formatting. Both surfaces should render markdown (per XGD's pattern using `marked` for output and TipTap for input).
3. **Reusable chat-card pattern** — a `<ChatCard>` UI primitive that every structured `tool_result` renderer consumes. Defined here so [[REQ-21]]'s `<DigestReport>`, [[REQ-28]]'s `<ConvertConfirmation>`, and every future structured tool_result inherit a consistent shell (header / body / optional actions row) rather than each one styling itself.

After this REQ: the AI receives structured tool results after each tool call AND can call a read tool to refresh its view of the canonical state. Assistant messages display as rendered markdown in the chat. The chat input editor accepts pasted markdown and renders it as formatted text; submission serializes back to markdown for the API. Structured `tool_result` blocks render as consistent chat cards.

Design discussion: in-app feedback from Claude running in the builder identified state visibility as the top friction ("I'm working from memory/inference rather than a confirmed updated state"). Operator separately flagged that assistant messages render as raw markdown. XGD's chat panel pattern (`marked@9` from esm.sh + TipTap editor) is the reference implementation. The chat-card pattern was added in the 2026-06-18 planning chat once we realised that [[REQ-21]] and [[REQ-28]] each ship card-style chat affordances and would otherwise diverge.

## Why free-coded

Bugs / gaps on top of an already-shipped feature ([[REQ-8]] builder). Narrow scope, settled design (mirror XGD's approach), no architectural change. Cohesive intent: make the AI's view of state coherent and the operator's view of chat content legible — including the new card pattern downstream renderers will reuse.

## Dependencies

- [[REQ-8]] — builder UI shell, chat panel, /api/chat endpoint.
- [[REQ-9]] — Operator API registry (for the new read tool).

## Demo critical-path alignment

This REQ is on the convert-flow demo critical path (paste URL → reproduce site). Per the 2026-06-18 planning chat, [[REQ-23]] / [[REQ-24]] (chat persistence) and [[REQ-27]] (Brief) are deferred — the demo runs against [[REQ-8]]'s in-memory chat handler. Nothing in this REQ depends on persistence; the structured tool_results, state-visibility read tool, markdown rendering, and `<ChatCard>` primitive all work against the existing handler.

## Deliverables

### Part 1: AI state visibility

**Structured tool results in chat dispatch (`apps/control-app/src/api/chat`)**

Every tool call returned by Anthropic gets a structured `tool_result` content block in the AI's next turn input:

```typescript
type ToolResult =
  | { ok: true,  applied: { tool: string, args: object, summary: string } }
  | { ok: false, error: { tool: string, validation: ValidationError } }
```

`summary` is a short human-readable description of what landed (e.g. `"hero.dials.spacingTop set to 'lg'"`). Lets the AI confirm its action without having to receive the full updated state every turn.

**`get_site_definition` read tool**

Add to `OPERATOR_ACTIONS` (from REQ-9):

```
name:          'get_site_definition'
plan_tier:     'trial'  (available to all; read-only)
tool_spec:     { description: "Read the current site definition (draft state).",
                 input: {} }
ui_route:      null      (chat-only; no UI affordance)
```

Handler returns the current `draft_definition` for the active site. The AI calls this when it needs to verify state — e.g., after a sequence of edits, or when continuing a complex multi-step change.

Cost note: site definitions are typically <100KB. Sending one per AI request is acceptable; if it becomes painful at scale, paginate by page or by module. v1 returns the whole thing.

**Per-turn state summary in system prompt**

When the AI is invoked for a new turn, the system prompt section that describes "current site state" is computed fresh from the canonical state (not from the previous turn's snapshot). Ensures continuation accuracy across long sessions.

### Part 2: Chat markdown rendering

**Assistant message rendering (`packages/builder-ui/src/ChatPanel`)**

Replace the existing plaintext renderer for assistant turns with a markdown renderer. Library: `react-markdown` (the React-idiomatic equivalent of XGD's `marked`). Options:

- GFM extensions enabled (tables, task lists, strikethrough)
- Code blocks rendered with syntax highlighting (any reasonable choice — `react-syntax-highlighter` is the standard pairing)
- Links open in new tab with `rel="noopener noreferrer"`
- Sanitization: react-markdown is XSS-safe by default; do not bypass

User-turn rendering stays plaintext (operator's typed input is shown as-is) — see Part 2b for input handling.

**Chat input editor (`packages/builder-ui/src/ChatPanel`)**

Replace the plain `<textarea>` with a TipTap editor:

- Extensions: StarterKit, Markdown (via `tiptap-markdown` or equivalent)
- Behavior: pasted markdown is parsed and rendered as formatted text in the editor; typing markdown shortcuts (e.g. `**bold**`) renders as bold; submission serializes editor state back to markdown for the API
- Same key bindings as the previous textarea: Cmd/Ctrl+Enter to send, Shift+Enter for newline
- Placeholder text remains

The editor's serialized markdown is what gets sent to `/api/chat`. Backend doesn't care which editor produced it.

### Part 3: Reusable `<ChatCard>` pattern

**Component (`packages/builder-ui/src/components/ChatCard.tsx`)**

A small composable primitive used by every structured-`tool_result` renderer. Props:

```typescript
type ChatCardProps = {
  title: string,
  icon?: ReactNode,             // small leading glyph (e.g. screenshot / convert / warning)
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger',
  children: ReactNode,           // body slot
  actions?: ReactNode,           // optional actions row (buttons, checkboxes)
  collapsed?: boolean,           // optional: card body can collapse to header-only
  onToggleCollapse?: () => void,
}
```

- Shell: bordered card with rounded corners; padding consistent with the chat bubble grid; tone applies a left-edge accent.
- Header row: icon + title, plus the collapse caret when `onToggleCollapse` is provided.
- Body slot is rendered as a vertical flow; long content scrolls within a max-height.
- Actions row sits at the bottom with a subtle divider; horizontal flex with consistent button styling.
- Cards live **inside the chat panel's message flow** — they are themselves rendered as an assistant-side message variant. The dispatcher decides whether a tool_result becomes a plain markdown message or a `<ChatCard>` based on the result's `kind` discriminator.

**`tool_result` → card dispatcher**

When the assistant turn includes a `tool_result` with a known `kind` (e.g. `reference_digest`, `convert_confirmation`, future `transcribe_progress`), the chat panel renders the dedicated component (which itself uses `<ChatCard>`). Unknown kinds fall back to the markdown renderer.

```typescript
const TOOL_RESULT_RENDERERS: Record<string, ComponentType<{result: ToolResult}>> = {
  reference_digest: DigestReport,        // shipped by REQ-21
  convert_confirmation: ConvertConfirmation,  // shipped by REQ-28
  transcribe_progress: TranscribeProgress,    // shipped by REQ-28
};
```

This REQ delivers the dispatcher + the `<ChatCard>` primitive. Downstream REQs supply the per-kind components.

### Sanitization + safety

- Assistant message HTML output goes through react-markdown's default sanitization. Raw HTML blocks in AI output are stripped (default react-markdown behaviour).
- Code blocks display verbatim — important for AI tool-result summaries that may include JSON.
- Links in assistant messages are clickable but open in new tabs.
- `<ChatCard>` does not bypass sanitization for its `children` — downstream renderers are responsible for their own content safety (they typically render structured data, not free HTML).

### Tests (`test_UAT_FC_<REQ-ID>_*`)

- `tool_call_returns_structured_ok_result` — successful tool call produces a `tool_result` with `ok: true` and a non-empty summary string visible in the AI's next prompt.
- `tool_call_returns_structured_error_result` — invalid dial value produces `tool_result` with `ok: false` and a validation error matching the validator's structured output.
- `get_site_definition_returns_current_draft` — calling the read tool returns the current `draft_definition` matching what the builder's store holds.
- `get_site_definition_available_on_trial` — trial plan can call the read tool (no plan-tier rejection).
- `assistant_markdown_renders_headers_lists_code` — a stubbed assistant message containing `## Heading`, `- list item`, and a fenced code block renders as `<h2>`, `<ul><li>`, and `<pre><code>` in the DOM.
- `assistant_markdown_strips_inline_html` — assistant message `<script>alert(1)</script>` does not produce a script tag in the DOM.
- `chat_input_paste_markdown_renders_formatted` — pasting `# Title\n\n**bold**` into the input editor renders heading and bold styling in the editor.
- `chat_input_submission_serializes_back_to_markdown` — submitting an edited message sends markdown (not HTML) to `/api/chat`.
- `chatcard_renders_with_title_body_actions` — a `<ChatCard>` instance renders the title in the header, the children in the body, and the action buttons in the actions row; an action click dispatches its callback.
- `chatcard_tone_applies_accent` — passing `tone="warning"` applies the warning accent class.
- `chatcard_collapse_toggles_body` — when `onToggleCollapse` is wired, clicking the caret hides the body and re-renders header-only.
- `tool_result_dispatcher_uses_kind` — a `tool_result` with `kind: "reference_digest"` is routed to `<DigestReport>` (stubbed in this REQ's tests); an unknown kind falls back to the markdown renderer.

## Out of scope

- Markdown rendering in module content fields (already framework-side; covered by future "framework markdown rendering" REQ if needed).
- Streaming token-by-token rendering of assistant messages — current behaviour renders on turn-complete; streaming UX is a later polish REQ.
- AI-generated rich content (images, embeds) — text-only assistant rendering for v1.
- Diff-style visualization of what changed per tool call.
- The per-kind components (`<DigestReport>`, `<ConvertConfirmation>`, `<TranscribeProgress>`) themselves — shipped by [[REQ-21]] and [[REQ-28]]. This REQ ships only the primitive, the dispatcher, and a stub component for the dispatcher unit test.

## Risks / open items

- **TipTap bundle size** — TipTap + extensions add ~30–60KB gzipped to the builder. Acceptable for the desktop-first builder app per DOC-8 §8.1 mobile-budget rules (which apply to customer sites, not the builder).
- **Markdown round-trip fidelity** — TipTap's markdown serialization may not preserve every edge case the user typed (e.g. exotic table syntax). For v1, lossy round-trip is acceptable — chat is for conversation, not document authoring.
- **Tool-result token cost** — adding structured tool_result blocks adds tokens per turn. Negligible for v1 (single-digit tool calls per turn); monitor if turns get chatty.

## Story points

5. State-visibility plumbing + read tool + react-markdown wiring + TipTap chat input + `<ChatCard>` primitive + dispatcher. (Was 4 before the chat-card pattern was added.)



## Free-coded delivery (2026-06-18)

**Status**: implemented, all tests pass (187/187), `xgd quality run --all-tests` clean, bundle built.

### Commit
- `8628a0a` — feat(chat): AI state visibility + chat markdown + ChatCard primitive (REQ-13) [FREE-CODED]

### Implementation notes (deviations from the original spec)

- **React → vanilla**: The original deliverables called for `react-markdown` + a `<ChatCard>` React component, but `packages/builder-ui` is vanilla TypeScript / DOM end-to-end. Translated to:
  - `marked@14` + `DOMPurify@3` for assistant message rendering (closer to XGD's reference `marked@9` pattern).
  - `createChatCard(parent, options)` vanilla factory matching the existing `createChatPanel` / `createPreviewPanel` style. Same props (title, icon, tone, body, actions, collapsed, onToggleCollapse), same UX.
- **TipTap stays as specified** (`@tiptap/core` + `@tiptap/starter-kit` + `tiptap-markdown`). Works in vanilla JS because it's built on ProseMirror, not React.
- **State-edit validator stays on the client** (REQ-8 §5.3 validator-of-record contract preserved). Server runs `applyToolCall` against a working copy *for the tool_result summary only*; the FE re-runs it to authoritatively apply.

### Files

- `apps/control-app/src/chat.ts` — multi-turn Anthropic loop (max 8 iterations) with structured `tool_result` blocks.
- `apps/control-app/src/operator/registry.ts` — `get_site_definition` system action; `ActionContext.siteDefinition` threading.
- `apps/control-app/src/operator/router.ts` — passes `siteDefinition: null` to handlers invoked via direct `/api/operator/*` route.
- `packages/builder-ui/src/components/chat-card.ts` — `<ChatCard>` primitive.
- `packages/builder-ui/src/components/tool-result-renderers.ts` — kind→renderer registry + fallback dispatcher.
- `packages/builder-ui/src/components/chat-panel.ts` — marked+DOMPurify assistant rendering, TipTap input, tool_result dispatcher wired into the message renderer.
- `packages/builder-ui/src/store.ts` — widened `ChatMessage.toolCalls` to include optional `result: ChatToolResultRecord`.
- `packages/builder-ui/src/chat-driver.ts` — consumes the new server `result` field, still re-applies via `applyToolCall` client-side.

### Tests (12 files, 22 cases, all passing)

UATs match every test listed in the REQ deliverables section:
- `tool_call_returns_structured_ok_result` — `tool_result` content block reaches the next Anthropic prompt with `ok:true` + summary.
- `tool_call_returns_structured_error_result` — invalid dial value → `ok:false` with structured validator output, `is_error:true` on the block.
- `get_site_definition_returns_current_draft` — read tool returns the current draft via `applied.data.site_definition`.
- `get_site_definition_available_on_trial` — all tiers see the tool; registration sanity.
- `assistant_markdown_renders_headers_lists_code` — `<h2>`, `<ul><li>`, `<pre><code>` from markdown source.
- `assistant_markdown_strips_inline_html` — `<script>` and on-event handlers removed by DOMPurify.
- `chat_input_paste_markdown_renders_formatted` — `setInputMarkdown("# Title\n\n**bold**")` renders `<h1>` and `<strong>` in the TipTap surface.
- `chat_input_submission_serializes_back_to_markdown` — send delivers markdown to `onSend`, not HTML.
- `chatcard_renders_with_title_body_actions` — header / body / actions row; clicks dispatch callbacks.
- `chatcard_tone_applies_accent` — all 5 tones add the correct class + `data-fc-chat-card-tone`.
- `chatcard_collapse_toggles_body` — caret click toggles body visibility, fires `onToggleCollapse(next)`.
- `tool_result_dispatcher_uses_kind` — registered kind routes to its renderer; unknown kind falls back to markdown; failures render danger-toned card.

### Bundle impact

`apps/control-app/public/_assets/builder.js` is now 1.2 MB unminified (≈250–400 KB gzipped) — TipTap/ProseMirror dominate. Accepted per the REQ's own §Risks note (desktop-first builder, DOC-8 §8.1 mobile budget does not apply).

### Out-of-scope items deliberately not delivered (confirms with REQ)

- No streaming token-by-token rendering.
- No diff-style visualization.
- No per-kind components (`<DigestReport>`, `<ConvertConfirmation>`, `<TranscribeProgress>`) — registered through the dispatcher by their owning REQs (REQ-21, REQ-28).


---

## REQ-21: Reference Digest schema + static-fetch path + Layer A signal extractors

## Problem

External-site ingestion needs a single canonical artifact — the Reference Digest — that **both the user and the AI consume**. Per [[DOC-9]] §3 this convergence (one artifact, two audiences) is itself a load-bearing design property: it makes AI reasoning auditable against something the operator can read.

Today there is no fetcher, no digest schema, and no extractor. This REQ lands the foundation: schema, static-fetch path, the deterministic Layer A extractors, and the AI commentary pass that finalizes the digest. The result is a markdown document (sectioned per [[DOC-9]] §9 KMS-aware shape) plus R2-stored screenshots, attached to the chat history that produced it.

## Scope

Land the `packages/extractor` package + the `analyze_page` AI tool. After this REQ:

- An AI tool call `analyze_page(url)` produces a Reference Digest record from any same-origin-respecting fetchable URL.
- The Reference Digest is a sectioned markdown document conforming to a stable schema, plus R2 references to screenshot(s) and asset thumbnails.
- The digest is attached to the chat history record and is renderable in the builder via the [[REQ-13]] `<ChatCard>` pattern — `<DigestReport>` is a chat-card variant.
- The AI commentary pass adds a "Summary" block at the top and a "What's missing" sub-section for absent signals.

Browser Rendering escalation is **out of scope for this REQ** — [[REQ-22]] ships that. This REQ uses Worker `fetch` + DOM parsing only. The escalation hook is wired but always returns "static-only" until REQ-22 lands.

## Demo critical-path alignment

This REQ is on the convert-flow demo critical path (paste URL → reproduce site). Per the 2026-06-18 planning chat, [[REQ-23]] / [[REQ-24]] (chat persistence) and [[REQ-27]] (Brief) are deferred. The "Alignment with persistent chat infrastructure" section at the bottom of this REQ describes the future wire-up — not the demo's runtime path. For the demo, `analyze_page` runs through [[REQ-8]]'s in-memory chat handler and the digest record lives only for the lifetime of the page session.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 3, 8 (partially), 9 inline:

- **Crawl depth cap for digest production**: 1 page only — the URL the operator provides. Sitemap discovery and multi-page inspiration crawls are [[REQ-29]]'s concern, not this REQ's.
- **Sparse-signal handling** ([[DOC-9]] §13.9): every signal field in the digest schema is optional. Absent fields are serialized as `not_detected` (string, not null), so the rendered markdown shows the absence as content, not as omission. The AI commentary pass is prompted to produce a "What's missing" line for each major section where signals are absent.
- **Palette role inference**: the extractor outputs 4 named roles — `background`, `body`, `accent`, `cta` — plus an unordered list of up to 6 supporting colors. Role inference uses a small ruleset (largest-area = background, largest-text-color cluster = body, most-saturated non-body = accent, most-contrasting-to-background = cta). When inference is uncertain (low confidence), the role is set to `not_detected` and the color drops into supporting.
- **Typography signals**: extract body family + size + weight; H1 / H2 / H3 family + size + weight; one detected pair (body + heading) labelled as `primary_pair`. Falls back to `not_detected` when computed styles are unavailable (which is most of the static-fetch path; [[REQ-22]] makes this signal much richer).
- **Layout signals**: max content width (in px), centered vs left bias (heuristic on hero block), and an above-the-fold density score (`sparse | balanced | dense`).
- **AI commentary pass**: a single LLM call producing the `Summary` block, per-section commentary, and the `What's missing` sub-section. Model = Anthropic Claude Haiku 4.5 (configured via existing model selector). Prompted with the full digest body but **not** the screenshot in this REQ ([[REQ-22]] adds multimodal once Browser Rendering is in place).
- **Digest persistence**: the digest record is attached to the chat history as a structured `tool_result` payload (per [[REQ-13]]'s structured tool_results model). The markdown body lives in the chat record; screenshots live in R2. There is no separate `digests` table.
- **Asset inventory** *(expanded per 2026-06-18 planning chat for the reproduce-the-site demo)*: every referenced media asset is recorded with a `kind` discriminator:
  - `kind: 'img'` — every `<img>` with a real `src` plus its `srcset` URLs.
  - `kind: 'background'` — every inline `style="background-image: url(...)"` and every CSS rule from `<style>` blocks whose `background-image` resolves to a `url(...)`. (Computed background-images from external stylesheets are picked up in [[REQ-22]] once Browser Rendering lands.)
  - `kind: 'video'` — every `<video src>` and every `<source src>` inside a `<video>` element.
  - Each record carries `{ url, alt, classification: hero|product|headshot|testimonial|decorative|unknown, width, height, kind }`. Classification is heuristic (largest-area-near-top = hero, etc.). The inventory is the candidate set the transcription ([[REQ-28]]) picks from when downloading assets to R2.
- **Inventory dedup**: same URL referenced multiple times → one record with a `references: number` count. This is the upstream half of the dedup the transcription ([[REQ-28]] Stage 4) relies on; combined with [[REQ-20]]'s per-URL KV cache it guarantees one fetch per URL across the entire convert flow.

## Design conversation

Full thread: [[CHAT-13]]. Key operator statements that scope this REQ:

> "I'm sure some digested version of the HTML would be much easier for the AI to understand but we need to make sure that it has or is exposing the kind of design content that would enable the AI to meaningfully have that conversation"
> — [[CHAT-13]] turn 2

> "What we should show them I think would be a report about the site number of pages the samples of the content core messaging colors layout navigation. Most of this could be generated entirely automatically with the AI adding a color commentary."
> — [[CHAT-13]] turn 3

> "An interesting observation here is that this could bring the content displayed to the AI to be much closer to the content displayed to the user. Both would be seeing some kind of digested summarized version of this site."
> — [[CHAT-13]] turn 3

The convergence — same digest for user and AI — is the architectural property this REQ instantiates.

From the 2026-06-18 planning chat:

> "our goal is to be able to reproduce their site so it looks as identical as possible using our framework if there are gaps we need to understand what they are"
> — operator framing for the demo

This drives the expanded asset inventory (background-image + video, not just `<img>`) — the digest must surface every candidate visual asset the transcription might want to mirror.

## IN

### `packages/extractor` (new package)

Public surface:

```typescript
type ReferenceDigest = {
  schemaVersion: 1,
  sourceUrl: string,
  fetchedAt: string,    // ISO-8601
  fetchPath: 'static' | 'rendered',
  summary: string,      // AI commentary pass output
  signals: {
    palette: PaletteSignals,
    typography: TypographySignals,
    layout: LayoutSignals,
    imagery: ImagerySignals,
    content: ContentTree,
    assetInventory: AssetRecord[],
  },
  commentary: {
    perSection: { [section: string]: string },
    whatsMissing: string[],
  },
  screenshotKeys: { mobile?: string, tablet?: string, desktop?: string },  // R2 keys; empty in this REQ
}

type AssetRecord = {
  url: string,                                                          // absolute, normalized
  kind: 'img' | 'background' | 'video',
  alt?: string,
  classification: 'hero' | 'product' | 'headshot' | 'testimonial' | 'decorative' | 'unknown',
  width?: number,
  height?: number,
  references: number,                                                  // dedup count
}
```

Every `Signals` sub-type uses `string | 'not_detected'` (or its array equivalent) for individual fields. The schema is exported as a Zod (or equivalent) validator so [[REQ-28]] can validate inputs to the transcription step.

Extractors (deterministic, no LLM):

- `parsePalette(html, baseUrl)` — collects inline + linked CSS colors, runs the role-inference ruleset.
- `parseTypography(html, baseUrl)` — extracts `font-family`, `font-size`, `font-weight` from declared styles only (static fetch can't compute, so this signal is often `not_detected`).
- `parseLayout(html)` — max-width heuristic from declared CSS, hero-block alignment heuristic, density score.
- `parseImagery(html, baseUrl)` — full asset inventory across all three `kind`s:
  - Walks every `<img>`: emits `kind: 'img'` records; expands `srcset` into siblings keyed by their URL.
  - Walks every element with an inline `style` attribute containing `background-image: url(...)`: emits `kind: 'background'` records.
  - Walks every `<style>` block, parses CSS rules, and for every `background-image: url(...)` declaration emits `kind: 'background'` records. (External stylesheets are deferred to [[REQ-22]]'s computed-CSS path.)
  - Walks every `<video src>` and every `<source src>` inside `<video>`: emits `kind: 'video'` records.
  - Resolves every URL to absolute form via `baseUrl`.
  - Dedups by absolute URL across all four discovery paths, incrementing `references`.
- `parseContent(html)` — heading tree, sections, list groups, form fields, nav links.

Renderer:

- `renderDigestMarkdown(digest)` — produces the KMS-aware markdown body ([[DOC-9]] §9 shape: title → Summary block → ToC → numbered sections). This is what gets stored on the chat record. The asset inventory section renders one sub-list per `kind` so the operator can see "5 images, 2 background images, 0 videos" at a glance.

### `apps/control-app` AI tool

`analyze_page` tool added to the AI tool surface:

```
input: { url: string }
output: { ok: true, digest: ReferenceDigest, digestMarkdown: string }
       | { ok: false, error: typed-error }
```

Implementation:

1. Call REQ-20's safety layer (`withFetchSafety`, rate limits, robots check, operator-intent token).
2. `safeFetch(url)` for the HTML body.
3. Run all five `parse*` extractors against the body.
4. Call the AI commentary LLM pass (Haiku 4.5) with the digest body to produce `summary` + `commentary`.
5. Hand back the full `ReferenceDigest` + rendered markdown to the AI dispatch.

### Static-only escalation hook

`shouldEscalateToRendered(digest)` lives in `packages/extractor` and always returns `false` in this REQ. [[REQ-22]] replaces the body.

### Builder UI rendering

`packages/builder-ui` gains a `<DigestReport>` component that consumes a digest record from a structured `tool_result` and renders it via [[REQ-13]]'s `<ChatCard>` pattern. The card is `tone: 'info'`, header "Reference Digest — {sourceUrl}", body renders the digest markdown via the same `react-markdown` pipeline as chat messages, actions row contains "Convert this site" and "Discard" buttons. The asset inventory renders as a structured sub-section showing `img / background / video` counts and a thumbnail strip per kind (thumbnails are external URLs in this REQ; [[REQ-28]] Stage 4 rewrites them to R2 keys after transcription).

`<DigestReport>` is registered with the [[REQ-13]] tool_result dispatcher under `kind: "reference_digest"`.

### KV digest caching

Per [[REQ-20]]'s cache layer, a digest is itself cached for 24 hours keyed on `sha256(url|schemaVersion)`. Cache hit returns the digest from KV without refetching or re-running extractors.

### Test fixtures

A small set of static HTML fixtures under `tests/fixtures/convert-flow/` (shared with [[REQ-22]] and [[REQ-28]]):

- `plain-html-site/` — a 3-section static page with explicit palette, declared typography, two `<img>`, one inline `background-image`, and a `<video src>`. The deterministic baseline.
- `sparse-signal/` — bare-bones HTML with no CSS, one `<img>`, no declared colors or fonts. Exercises `not_detected` paths.

Fixtures are served via vitest + Miniflare's static file route in tests; no real HTTP server needed.

## OUT (explicitly deferred)

- Browser Rendering integration — [[REQ-22]].
- Multi-page crawl, sitemap discovery — [[REQ-29]].
- Layer B transcription to module instances + theme tokens — [[REQ-28]].
- Multi-modal AI commentary using the screenshot — added by [[REQ-22]], not here.
- Non-website reference sources (Figma, Pinterest, PDF) — out of scope per [[DOC-9]] §12.
- **Asset download to R2** — the asset inventory records URLs; the actual download + AssetRef-rewrite happens in [[REQ-28]] Stage 4 (post-transcription), so we only download what the converted site actually references.
- A standalone `digests` D1 table — digest persistence is the chat record.
- Background-image URLs from **external** stylesheets — added by [[REQ-22]] (computed CSS resolves these naturally). This REQ only sees `<style>` blocks + inline `style`.

## Dependencies

- [[REQ-20]] — safety contract (mandatory for every fetch).
- [[REQ-13]] — structured tool_results model + `<ChatCard>` primitive (`<DigestReport>` consumes both).
- [[REQ-20]] — `ASSETS_BUCKET` R2 binding (screenshot keys land here once [[REQ-22]] wires Browser Rendering).
- [[DOC-9]] §3, §6.1, §9 — Reference Digest definition, Layer A signal list, KMS-aware shape.

## Acceptance criteria

1. `analyze_page("https://example.com")` returns a valid `ReferenceDigest` with `schemaVersion: 1`, all five signal categories populated (or `not_detected`), and `digestMarkdown` matching the KMS-aware shape (title, blockquote-summary, `## Table of contents`, numbered sections).
2. Calling `analyze_page` against a URL with no `<link rel="stylesheet">` and no inline `style` attributes: palette and typography signals serialize as `not_detected`; the AI commentary's `whatsMissing` array contains entries for both.
3. Palette role inference: page with `background:#fff; body text:#222; primary button:#2563eb; accent heading:#16a34a`: digest signals expose `{ background:"#fff", body:"#222", cta:"#2563eb", accent:"#16a34a" }`.
4. Asset inventory `kind: 'img'`: page with three `<img>` (a 1200×600 near top, a 400×400 mid-page, a 100×100 in nav): the 1200×600 is classified `hero`; the 100×100 is classified `decorative`; the third is `unknown` if no heuristic matches; each emits exactly one record with `references: 1`.
5. Asset inventory `kind: 'background'`: page with `<section style="background-image: url(/hero.jpg)">` and a `<style>` block declaring `.cta { background-image: url(/cta-bg.png) }`: both URLs are present in the inventory with `kind: 'background'`.
6. Asset inventory `kind: 'video'`: page with `<video src="/intro.mp4"></video>` and `<video><source src="/promo.webm"></video>`: both URLs are present with `kind: 'video'`.
7. Asset inventory dedup: the same `/hero.jpg` referenced from both an inline `background-image` and an `<img src>` produces exactly one record (keyed by absolute URL) with `references: 2` and `kind` set to the first-discovered kind (`img` wins over `background` when both apply).
8. Digest markdown rendering: the `digestMarkdown` field validates as commonmark, contains exactly one H1 (the title), and contains a section per signal category. The asset-inventory section enumerates `img / background / video` counts and lists each asset under its kind.
9. The chat record after a successful `analyze_page` contains a structured `tool_result` of `kind: "reference_digest"` carrying the full digest object; the builder's `<DigestReport>` chat-card renders it via the [[REQ-13]] dispatcher without re-fetching.
10. The KV digest cache returns the cached digest on a second identical `analyze_page` call within 24h; the second call does not invoke `safeFetch` or the LLM pass.
11. The escalation hook (`shouldEscalateToRendered`) is invoked at the right point in the pipeline and always returns `false` in this REQ; the path is exercised by a unit test that documents the integration point for [[REQ-22]].
12. Every failure mode from the safety layer ([[REQ-20]] §Acceptance criteria 1–12) propagates as a typed error on the `analyze_page` `ok:false` branch; no safety failure leaks as an uncaught exception.
13. UAT: operator pastes a URL in chat → AI calls `analyze_page` → `<DigestReport>` chat-card renders in the chat panel with palette swatches, type sample, content tree, asset inventory (with kinds), and AI summary visible. Total wall-clock under 8 seconds for a typical small business site on the static path.

## Story points

7. Schema + 5 extractors (parseImagery now covers 3 asset kinds) + commentary pass + tool dispatch + `<DigestReport>` chat-card variant + KV caching + test fixtures.

---

## Future alignment: persistent chat infrastructure ([[REQ-23]] / [[REQ-24]])

[[REQ-23]] / [[REQ-24]] are deferred from the demo critical path; this section describes the integration once they land. **Not blocking for this REQ.**

- `analyze_page` will be invoked through [[REQ-24]]'s `POST /api/chat` flow.
- The Reference Digest result will persist as a row in [[REQ-23]]'s `chat_messages` table, with the digest record carried in `tool_calls_json`. Screenshot R2 keys (added by [[REQ-22]]) will be referenced from `tool_calls_json` and live in R2 under the existing asset-bucket layout.
- The digest will be reachable later in the same chat via tail-prime + scrollback, and across sessions via [[REQ-24]]'s `search_transcripts` + `read_session_range` tools — no separate "digests" index needed.
- Chat session deletion ([[REQ-23]] cascade) will sweep the referenced screenshot R2 keys.

These integrations require no schema changes here; this REQ's acceptance criteria stand against [[REQ-8]]'s in-memory chat handler.