---
uid: request-68bfdf1e
id: REQ-9
type: request
title: 'Operator API foundation: /api/operator namespace + SSE event registry + system-action
  framework + plan-tier authorization'
created_by: xgd
created_at: '2026-06-15T22:42:14.698941+00:00'
updated_at: '2026-06-15T22:42:14.698941+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  story_points: 4
  auto_merge_back: true
  needs_review: false
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
