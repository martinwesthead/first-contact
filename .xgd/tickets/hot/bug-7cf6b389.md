---
uid: bug-7cf6b389
id: BUG-4
type: bug
title: 'Convert flow: ConvertConfirmation Confirm/Cancel buttons are unwired'
created_by: xgd
created_at: '2026-06-19T23:43:39.348958+00:00'
updated_at: '2026-06-19T23:43:39.348958+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  severity: high
  story_points: 2
  auto_merge_back: true
  needs_review: false
---

## Symptom

In the builder, the convert flow surfaces a **ConvertConfirmation** chat-card asking the operator to confirm before transcription overwrites the draft. Clicking the **Confirm** button on the card does nothing visible — the card collapses, but the AI never re-invokes `transcribe_site`. The operator has to type something like "yes" / "confirmed" into chat for transcription to proceed.

This breaks REQ-28 AC2 ("Operator clicks Confirm: chat metadata gains `convertConfirmed[chatId] = true`; the AI re-invokes `transcribe_site`; transcription proceeds.")

## Root cause

Two missing wires:

1. **No event listener exists.** The Confirm button dispatches `CustomEvent("fc:convert-confirmed", { detail: { url, ownsSite }, bubbles: true })` on the document (`packages/builder-ui/src/components/convert-confirmation.ts:89-94`). Grep across the entire builder-ui source returns zero `addEventListener` calls for `fc:convert-confirmed` or `fc:convert-cancelled`. The event fires into the void.

2. **`registerConvertConfirmation()` is never called.** The renderer is exported from `convert-confirmation.ts:117-122`. `bootBuilder` (`packages/builder-ui/src/main.ts:43`) calls `registerDigestReport()` but not `registerConvertConfirmation()`. So the chat-card never even mounts — until something else mounts it incidentally, or by re-render from the store, the card might not even appear correctly.

REQ-28's implementation landed the component but the boot-time wiring and the listener bridge that turns the click into a re-invocation were never built. The chat-card itself works; the click handler dispatches; nothing on the other side.

## Fix

1. Call `registerConvertConfirmation()` in `bootBuilder` alongside `registerDigestReport()`.
2. Add a listener bridge that, on `fc:convert-confirmed`, drives a re-invocation of `transcribe_site` through the existing chat loop. Two viable shapes:
   - **Synthetic user turn**: inject a hidden chat message like "I confirm. Proceed." → `runChatTurn` → AI sees the confirmation and calls `transcribe_site` again. Simplest, no new API surface, mirrors how the user worked around the bug manually.
   - **Direct tool re-invocation**: bypass the chat loop and call `transcribe_site` directly with the chat metadata flag set. Faster but adds a parallel path the chat loop doesn't know about.

Synthetic user turn is the right shape — preserves a single chat-loop entry point and keeps the chat history honest about what happened. The message text can be standardised so the AI's prompt knows what to do with it.

3. The `fc:convert-cancelled` event also needs a listener that emits a chat message ("Convert cancelled.") so the operator sees feedback. Same shape.

## Test plan

UATs in `tests/test_UAT_FC_BUG-XX_*`:

1. **registerConvertConfirmation invoked at boot**: spy on `registerToolResultRenderer` (or whatever the dispatcher's register fn is); call `bootBuilder`; assert the spy was called with `kind: "convert_confirmation"`.
2. **Confirm dispatch triggers chat turn**: boot the builder with a stubbed chat endpoint that records turn payloads; dispatch `fc:convert-confirmed` on the document with mock detail; assert the stub fetch received a turn whose user message matches the standardised confirmation text.
3. **Cancel dispatch triggers chat turn**: same shape for `fc:convert-cancelled`.

Regression scope: REQ-28's `test_UAT_FC_REQ-28_convert_confirmation_card.test.ts` (4 tests) — the card's internal behaviour should still pass.
