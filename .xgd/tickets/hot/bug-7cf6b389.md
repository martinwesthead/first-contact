---
uid: bug-7cf6b389
id: BUG-4
type: bug
title: 'Convert flow: ConvertConfirmation Confirm/Cancel buttons are unwired'
created_by: xgd
created_at: '2026-06-19T23:43:39.348958+00:00'
updated_at: '2026-06-20T18:40:25.472809+00:00'
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
  - 502d741b2b57068764909b543b7a1b5188749599
  version: 0.14.1236
---

## ⚠️ Superseded by [[REQ-35]] (landed)

[[REQ-35]] has landed (xgd-working commit 58fce2bce264137fade6564aa1b0c73a993c2876) and removes the destructive-confirmation gate entirely. The code BUG-4 was attempting to fix no longer exists: `<ConvertConfirmation>` is deleted, the `fc:convert-confirmed` / `fc:convert-cancelled` listener bridge is gone, and `transcribe_site` proceeds end-to-end on every invocation. **Do not implement BUG-4 — it is obsolete.**

The two fixes BUG-4 itself shipped (registering the renderer at boot, adding the listener bridge, threading `x-session-id` through chat-driver) were reverted as part of REQ-35 to the extent they were tied to the gate, except for `x-session-id` forwarding — that survives in `runChatTurn` and `bootBuilder`'s session-id resolution because it remains useful infrastructure for any session-scoped operator action.

---

## Original symptom (kept for history)

In the builder, the convert flow surfaced a **ConvertConfirmation** chat-card asking the operator to confirm before transcription overwrote the draft. Two failure modes:

1. **Pre-card rejection**: `transcribe_site` rejected before any card rendered, with error `session_id required to track convert confirmation`. The browser's chat driver was not sending the `x-session-id` header.
2. **Post-card no-op**: Once a card *did* render, clicking **Confirm** did nothing visible — the card collapsed but the AI never re-invoked `transcribe_site`. The operator had to type "yes" into chat for transcription to proceed.

## Original root cause (kept for history)

Three missing wires across boot, transport, and event-bridging:

1. **`registerConvertConfirmation()` was never called.** The renderer was exported from `convert-confirmation.ts` but `bootBuilder` did not register it, so the dispatcher had no route for `kind: 'convert_confirmation'`.
2. **No event listener existed for the card's actions.** The Confirm button dispatched `fc:convert-confirmed` on the document but nothing listened.
3. **No `x-session-id` header was sent.** `runChatTurn` only set `content-type`, so `extractSession` returned `session_id: null` and `transcribeSiteHandler` rejected outright.

## Original fix (kept for history; partially reverted by REQ-35)

Wired the renderer at boot, attached document-level listeners that drove a synthetic user turn via `runChatTurn`, and threaded a per-tab session id through chat-driver. REQ-35 removed the renderer, the listeners, and the gate itself. The `x-session-id` plumbing remains — it's general-purpose, not tied to convert-confirmation.

## Closeout

Closing this bug out as obsolete is part of REQ-35's acceptance criteria. No further action required on this ticket.
