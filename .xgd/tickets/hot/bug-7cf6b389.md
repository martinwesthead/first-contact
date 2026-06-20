---
uid: bug-7cf6b389
id: BUG-4
type: bug
title: 'Convert flow: ConvertConfirmation Confirm/Cancel buttons are unwired'
created_by: xgd
created_at: '2026-06-19T23:43:39.348958+00:00'
updated_at: '2026-06-20T00:15:59.353077+00:00'
completed_at: null
last_field_updated: body
status: free_coded
fields:
  priority: high
  severity: high
  story_points: 2
  auto_merge_back: true
  needs_review: false
  commits:
  - 5242e88657f9018756420ac6e9ccc480f9a853f5
  version: 0.14.1236
---

## Symptom

In the builder, the convert flow surfaces a **ConvertConfirmation** chat-card asking the operator to confirm before transcription overwrites the draft. Two failure modes were observed:

1. **Pre-card rejection**: `transcribe_site` rejected before any card rendered, with error `session_id required to track convert confirmation`. The browser's chat driver was not sending the `x-session-id` header, so `ctx.session.session_id` was null inside the handler.
2. **Post-card no-op**: Once a card *did* render, clicking **Confirm** did nothing visible — the card collapsed but the AI never re-invoked `transcribe_site`. The operator had to type "yes" / "confirmed" into chat for transcription to proceed.

Together these broke REQ-28 AC2 ("Operator clicks Confirm: chat metadata gains `convertConfirmed[chatId] = true`; the AI re-invokes `transcribe_site`; transcription proceeds.")

## Root cause

Three missing wires across boot, transport, and event-bridging:

1. **`registerConvertConfirmation()` was never called.** The renderer is exported from `convert-confirmation.ts:117-122`. `bootBuilder` (`packages/builder-ui/src/main.ts`) called `registerDigestReport()` but not `registerConvertConfirmation()`. So the dispatcher had no route for `kind: 'convert_confirmation'`.
2. **No event listener existed for the card's actions.** The Confirm button dispatches `CustomEvent("fc:convert-confirmed", { detail: { url, ownsSite }, bubbles: true })` on the document (`packages/builder-ui/src/components/convert-confirmation.ts:89-94`). Grep across the entire builder-ui source returned zero `addEventListener` calls for `fc:convert-confirmed` or `fc:convert-cancelled`. The event fired into the void.
3. **No `x-session-id` header was sent.** `runChatTurn` (`packages/builder-ui/src/chat-driver.ts`) only set `content-type`. `extractSession` (`apps/control-app/src/operator/types.ts:28`) returns `session_id: null` when the header is absent. `transcribeSiteHandler` rejects null `session_id` outright (`apps/control-app/src/operator/transcribe-site.ts:96-98`), so the convert flow never reached the confirmation branch and the AI saw a `failed` tool_result instead of a `convert_confirmation` payload.

## Fix (landed)

In `packages/builder-ui/src/main.ts` and `packages/builder-ui/src/chat-driver.ts`:

1. Import and call `registerConvertConfirmation()` alongside `registerDigestReport()` so the dispatcher routes `kind: 'convert_confirmation'` tool_results to the warning-toned card.
2. Add document-level listeners for `fc:convert-confirmed` and `fc:convert-cancelled`. The listeners drive a **synthetic user turn** through the existing `runChatTurn`:
   - Confirm → `"I confirm. Proceed with converting <url>."` (with `" I own this site."` appended when `ownsSite=true`).
   - Cancel → `"Cancel the conversion of <url>."`
3. Both listeners are removed in `destroy()` so re-mounting the builder doesn't accumulate handlers.
4. `runChatTurn` now accepts an optional `sessionId` and forwards it as `x-session-id` on every POST.
5. `bootBuilder` resolves a per-tab session ID at boot (explicit option → `sessionStorage[SESSION_ID_STORAGE_KEY]` → freshly-minted `crypto.randomUUID()`), persists it for the lifetime of the tab, and threads it into the editor `onSend` *and* both convert-event listener turns.

The synthetic-user-turn shape was chosen over direct tool re-invocation because it preserves a single chat-loop entry point and keeps the chat history honest about what the operator did — mirroring how operators were already working around the bug manually.

## Test plan (landed)

`tests/test_UAT_FC_BUG-4_convert_confirmation_listener.test.ts` — 8 UATs:

1. `bootBuilder` registers the `convert_confirmation` tool_result renderer.
2. Dispatching `fc:convert-confirmed` drives a `/api/chat` POST whose last user message confirms the URL (no ownership clause when `ownsSite=false`).
3. Dispatching `fc:convert-confirmed` with `ownsSite=true` includes the ownership clause.
4. Dispatching `fc:convert-cancelled` drives a `/api/chat` POST whose last user message cancels the conversion.
5. Chat POSTs include an `x-session-id` header equal to the explicit `sessionId` option.
6. When no explicit `sessionId` is given, `bootBuilder` mints one, persists it to `sessionStorage` under `SESSION_ID_STORAGE_KEY`, and sends it on POSTs.
7. An existing `sessionStorage[SESSION_ID_STORAGE_KEY]` value is reused across boots in the same tab.
8. After `destroy()`, neither convert event drives a chat turn (listeners cleaned up).

Regression scope: full vitest run — **327/327 tests pass**, including REQ-28 (`test_UAT_FC_REQ-28_convert_confirmation_card.test.ts`), REQ-31 (`test_UAT_FC_REQ-31_preview_panel_reset_button.test.ts`), and REQ-21 end-to-end (`test_UAT_FC_REQ-21_end_to_end_chat_renders_digest.test.ts` — already sends `x-session-id: session-e2e`, so the new header is backwards-compatible with the server contract).
