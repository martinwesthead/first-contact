---
uid: request-68bfdf1e
id: REQ-9
type: request
title: 'Operator API foundation: /api/operator namespace + SSE event registry + system-action
  framework + plan-tier authorization'
created_by: xgd
created_at: '2026-06-15T22:42:14.698941+00:00'
updated_at: '2026-06-25T02:41:17.286699+00:00'
completed_at: null
last_field_updated: status
status: bundled
fields:
  priority: medium
  story_points: 4
  auto_merge_back: true
  needs_review: false
  commits:
  - 2a774df5356e19c46a16fab8483e8fd177f38570
  bundled_in: bundle-bbb1bd9c
---

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