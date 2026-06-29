---
uid: acceptance_criterion-b09e1d20
id: AC-734
type: acceptance_criterion
title: A throwing tool call in a batch yields one structured ok:false result without
  dropping the sibling calls' results
created_by: xgd
created_at: '2026-06-29T22:26:58.191557+00:00'
updated_at: '2026-06-29T22:26:58.191557+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the chat layer dispatches a batch of tool calls in a single turn and one of the `state_edit` calls throws an unexpected error while being applied, that call produces exactly one structured `ok: false` tool result — its error message has the form `tool '<name>' threw: <error>`, and the `tool_result` block returned to the model for that call is flagged `is_error: true` — while every other call in the same batch still produces its own result (the surrounding `ok: true` calls are not lost). The whole turn does NOT collapse to a single stream-level `error` event. The throw is recorded on the observability log as an `apply_tool_call_threw` event naming the offending tool.

## Verification

Drive `/api/chat` with a stubbed Anthropic streaming response that returns a batch of three `tool_use` blocks — two well-formed `state_edit` calls and one middle call whose tool application is forced to throw (inject the apply function via the chat handler deps so the throw is deterministic). Consume the SSE response and assert: no stream-level `error` event fires; the `done` payload carries three tool calls with the two flanking calls `ok: true` and the thrower `ok: false` (its message contains `threw`); three `tool_result` SSE events fire in dispatch order; the next outbound Anthropic user message contains three `tool_result` blocks with `is_error: true` only on the thrower; and the log hook recorded an `apply_tool_call_threw` event whose detail names the thrown tool.
