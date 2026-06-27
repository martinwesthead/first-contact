---
uid: story-a07c8ed3
id: STORY-51
type: story
title: Operator action dispatch namespace with plan-tier auth and SSE event channel
created_by: xgd
created_at: '2026-06-27T00:08:37.399506+00:00'
updated_at: '2026-06-27T00:19:36.903815+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-f14050e3
  story_kind: feature
  story_points: 3
---

## Story

As a platform chat handler driving the control-app worker, I want an addressable `/api/operator/*` namespace with a single registry of typed actions, plan-tier-gated dispatch, server-side execution of system actions, and a multiplexed Server-Sent Events channel, so that the AI and the builder UI share one source of truth for operator capabilities and stay in sync as state and side-effects land.

## Description

This story establishes the Operator API as a first-class control-plane surface. Every operator action lives at `/api/operator/<action_name>` and is described by a single registry entry that captures input schema, plan-tier requirement, category (`state_edit` vs `system_action`), a side-effect description, the Anthropic tool spec for AI exposure, and an optional UI route for builder parity. Incoming POST requests dispatch through the registry: unknown names return 404, plan-tier mismatches return 403 before the handler runs, state-edit tools (Category 1) reject direct POSTs because they execute client-side via the chat path, and system actions (Category 2) execute server-side and return a structured result.

Authentication for v1 is header-based: the worker reads `x-account-id` and `x-plan-tier`, and missing/invalid headers default to `account_id="anonymous"` and `plan_tier="trial"`. There is no distinct "anonymous" tier — anonymous and trial share rank 0. The AI tool list is filtered by plan tier before being sent to Anthropic, and the same registry entries that build the tool list also gate dispatch, resolving REQ-8's "grandfathered tools" contradiction in favor of a single source of truth.

A new SSE endpoint at `GET /api/operator/events?session_id=<id>` opens an event-stream channel that multiplexes five event types: `chat:append`, `state:diff`, `state:invalidate`, `action:notify`, and `validation:error`. System actions emit `action:notify` on success; validation rejections emit `validation:error` with a structured `{path, expected, got}` payload that the AI can self-correct against. A parity-audit CLI lists every registered action whose `ui_route` is null/unimplemented so future REQs can enforce the "every operator action ships UI + AI tool" architectural invariant.

## Technical Context

- The SSE event bus is an in-memory module-level singleton keyed by `session_id` with a per-session subscriber set. This is sufficient for the single-isolate v1; production graduation to Durable Objects (so SSE subscribers and system-action emitters can live in different isolates) is a follow-up REQ and is explicitly out of scope here.
- Plan-tier ranking is `trial=0, paid=1, enterprise=2`; higher tiers permit lower-tier actions.
- The defensive plan-tier 403 is implemented as a single gate at the dispatcher, run before the handler is invoked, rather than as a re-check inside each handler. The bundle intent describes this as a "defensive 403 inside handlers"; the code reality is one dispatcher-level gate. Either reading satisfies the architectural goal (the AI tool list is the primary filter and the dispatcher is the defensive backstop), but reviewers should know there is no second check inside individual handlers.
- The SSE endpoint takes `session_id` as a query parameter while POST dispatch takes `x-session-id` as a header. This asymmetry is intentional for v1 (SSE is opened by `EventSource`, which cannot set custom headers) but should be documented for client implementers.
- The bundle intent specifies a 15-second heartbeat on the SSE channel. The current implementation sends only a one-shot `: connected <sessionId>` comment frame at stream open; there is no recurring heartbeat. This AC asserts the intended behavior; regression will surface the gap if the code is not yet conformant.
- The parity-audit tool currently classifies any non-null `ui_route` as `ui-missing` (the `ui-declared` status is unused). For v1 this is acceptable because every registered action has `ui_route: null`; future stories that wire builder UI will refine the classifier.
- The seed registry includes the two intent-named entries (`publish_stub` at `paid`, `report_validation_rejection` at `trial`) plus two additional system actions already present in the worker (`get_site_definition`, `analyze_page`). These are valid registry entries that exercise the read-only and side-effecting paths.
- DOC-5 architectural principle ("Operator API parity") is satisfied by the `tool_spec` + `ui_route` fields on every registry entry; the parity-audit CLI is the enforcement scaffold.

## Dependencies

None.

## Story Points

3