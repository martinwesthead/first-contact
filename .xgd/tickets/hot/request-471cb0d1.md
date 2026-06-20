---
uid: request-471cb0d1
id: REQ-38
type: request
title: 'Chat loop: per-call results survive when one handler throws'
created_by: xgd
created_at: '2026-06-20T21:09:44.034527+00:00'
updated_at: '2026-06-20T21:33:26.515204+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

When I (the AI) fire multiple tool calls in a batch, if one fails or drops I currently have no reliable way to know. I need per-call success/failure results that are guaranteed to be returned before the next batch fires. This is partly a framework constraint and partly how the chat loop handles parallel calls.

## Diagnosis

`apps/control-app/src/chat.ts:228` calls `applyToolCall(...)` for every `state_edit` tool_use block but does NOT wrap the call in `try/catch`. The sibling `system_action` path on line 268-280 IS wrapped. If `applyToolCall` throws (e.g. an unexpected input shape that escapes its internal `ok:false` returns), the exception propagates out of `handleChatRequest`, the worker returns 502, and the AI loses every result for that turn — including the calls that already succeeded earlier in the same batch and the ones that would have succeeded after.

From the AI's perspective the symptom is: results look fine on the wire (or absent entirely) but the actual site state doesn't match what the results said happened. The AI can't tell the difference between "this call succeeded" and "this call threw and took the whole batch with it."

## Scope

Make per-call results survive a single thrower:

1. Wrap the `state_edit` call to `applyToolCall` at `chat.ts:228` in `try/catch`. On throw, synthesise an `ok:false` `ChatToolResult` with a `validation.message` of the form `tool '<name>' threw: <error>`, push it to `allToolCalls`, and emit a `tool_result` block with `is_error: true` exactly as the existing failure path does. The other calls in the same batch keep executing.
2. Inject `applyToolCall` through the existing `ChatHandlerDeps` so a UAT can deterministically force one call in a batch to throw without monkey-patching the module.
3. Log the throw via the existing `log` hook (`apply_tool_call_threw`) so a real production occurrence shows up in observability.

OUT: refactoring `applyToolCall` itself to be exception-proof, or changing the wire shape of `ChatToolResult`. Existing consumers (FE chat-driver, tool_result_renderers) keep working unchanged.

## UAT

`tests/test_UAT_FC_REQ-38_one_throw_does_not_drop_batch.test.ts`:

- Stub Anthropic to return a batch of 3 `tool_use` blocks (two well-formed `state_edit` calls plus one that the injected `applyToolCall` will throw on), followed by a final text turn.
- Inject `deps.applyToolCall` that throws for the targeted call and delegates to the real implementation for the others.
- Assert: response status 200 (no 502), `body.toolCalls` has all 3 entries with the thrower marked `ok:false` and the other two `ok:true`, and the next Anthropic call's last user message contains 3 `tool_result` blocks with `is_error: true` only on the thrower.