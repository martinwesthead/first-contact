---
uid: bug-7cf6b389
id: BUG-4
type: bug
title: 'Convert flow: ConvertConfirmation Confirm/Cancel buttons are unwired'
created_by: xgd
created_at: '2026-06-19T23:43:39.348958+00:00'
updated_at: '2026-06-19T23:49:40.235332+00:00'
completed_at: null
last_field_updated: body
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

2. **`registerConvertConfirmation()` is never called.** The renderer is exported from `convert-confirmation.ts:117-122`. `bootBuilder` (`packages/builder-ui/src/main.ts`) calls `registerDigestReport()` but not `registerConvertConfirmation()`. So the chat-card never even mounts via the dispatcher.

REQ-28's implementation landed the component but the boot-time wiring and the listener bridge that turns the click into a re-invocation were never built.

## Fix (landed)

In `packages/builder-ui/src/main.ts`:

1. Import and call `registerConvertConfirmation()` alongside `registerDigestReport()` so the dispatcher routes `kind: 'convert_confirmation'` tool_results to the warning-toned card.
2. Add document-level listeners for `fc:convert-confirmed` and `fc:convert-cancelled`. The listeners drive a **synthetic user turn** through the existing `runChatTurn`:
   - Confirm → `"I confirm. Proceed with converting <url>."` (with `" I own this site."` appended when `ownsSite=true`).
   - Cancel → `"Cancel the conversion of <url>."`
3. Both listeners are removed in `destroy()` so re-mounting the builder doesn't accumulate handlers.

The synthetic-user-turn shape was chosen over direct tool re-invocation because it preserves a single chat-loop entry point and keeps the chat history honest about what the operator did — mirroring how operators were already working around the bug manually.

## Test plan (landed)

`tests/test_UAT_FC_BUG-4_convert_confirmation_listener.test.ts` — 5 UATs:

1. `bootBuilder` registers the `convert_confirmation` tool_result renderer.
2. Dispatching `fc:convert-confirmed` drives a `/api/chat` POST whose last user message confirms the URL (no "I own this site" clause when `ownsSite=false`).
3. Dispatching `fc:convert-confirmed` with `ownsSite=true` includes the ownership clause.
4. Dispatching `fc:convert-cancelled` drives a `/api/chat` POST whose last user message cancels the conversion.
5. After `destroy()`, neither event drives a chat turn (listeners cleaned up).

Regression scope verified: REQ-28's `test_UAT_FC_REQ-28_convert_confirmation_card.test.ts` (4 tests) and REQ-31's `test_UAT_FC_REQ-31_preview_panel_reset_button.test.ts` (4 tests) all still pass. Total: 13 tests, all green.
