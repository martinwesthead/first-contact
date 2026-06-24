---
uid: request-471cb0d1
id: REQ-38
type: request
title: 'Chat loop: per-call results survive when one handler throws'
created_by: xgd
created_at: '2026-06-20T21:09:44.034527+00:00'
updated_at: '2026-06-24T17:59:17.933019+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 3a476353141abfd84e00af4c3f0ea94f57bfe5a0
  - 395e2bc249b1d81b6a63ef329f8552915088b0a7
  version: 0.0.18
---

When I (the AI) fire multiple tool calls in a batch, if one fails or drops I currently have no reliable way to know. I need per-call success/failure results that are guaranteed to be returned before the next batch fires. This is partly a framework constraint and partly how the chat loop handles parallel calls.

## Status: free-coded on 2026-06-20

Landed in commits `3a47635` (fix + UAT) and `395e2bc` (version bump 0.0.17 → 0.0.18) on top of REQ-36's SSE refactor (which is the structure this fix attaches to).

## Diagnosis

`apps/control-app/src/chat.ts` (in the REQ-36 SSE handler) called `applyToolCall(...)` for every `state_edit` tool_use block but did NOT wrap the call in `try/catch`. The sibling `system_action` path WAS wrapped. If `applyToolCall` threw (e.g. an unexpected input shape that escaped its internal `ok:false` returns), the exception escaped the for-loop, was caught by the outer stream-level `try/catch`, and collapsed the whole turn to a single `error` SSE event — the AI lost every result for the batch, including the calls that already succeeded before the throw and the ones that would have succeeded after.

From the AI's perspective the symptom was: results looked fine (or absent entirely) but the actual site state didn't match what the results said happened. The AI couldn't tell the difference between "this call succeeded" and "this call threw and took the whole batch with it."

## Fix

In `apps/control-app/src/chat.ts`:

1. Wrap the `state_edit` call to `applyToolCall` in `try/catch`. On throw, synthesise an `ok:false` `ChatToolResult` with a `validation.message` of the form `tool '<name>' threw: <error>`, push it to `allToolCalls`, emit a `tool_result` SSE event for the FE, and emit a `tool_result` block with `is_error: true` exactly as the existing failure path does. The other calls in the same batch keep executing.
2. Inject `applyToolCall` through `ChatHandlerDeps` (new optional `applyToolCall?: typeof applyToolCall` field) so a UAT can deterministically force one call in a batch to throw without monkey-patching the module. Production uses the imported default.
3. Log the throw via the existing `log` hook (`apply_tool_call_threw`) so a real production occurrence shows up in observability.

OUT: refactoring `applyToolCall` itself to be exception-proof, or changing the wire shape of `ChatToolResult`. Existing consumers (FE chat-driver, tool_result_renderers) keep working unchanged.

## UAT

`tests/test_UAT_FC_REQ-38_one_throw_does_not_drop_batch.test.ts`:

- Stubs Anthropic's streaming Messages API to return a batch of 3 `tool_use` blocks (two well-formed `set_module_dial` calls plus one `set_module_content` whose injected `applyToolCall` throws), followed by a final text turn.
- Injects `deps.applyToolCall` that throws for the targeted call and delegates to the real implementation for the others.
- Consumes the chat handler's SSE response via `consumeChatSSE` (from `_helpers_REQ-36_chat_sse.ts`).
- Asserts: no whole-stream `error` event fires, the `done` payload contains 3 `toolCalls` (thrower marked `ok:false`, others `ok:true`), 3 `tool_result` SSE events fired in order, and the next Anthropic call's last user message contains 3 `tool_result` blocks with `is_error: true` only on the thrower. Also asserts the `apply_tool_call_threw` log hook fired with the tool name.

Confirmed green on 2026-06-20.