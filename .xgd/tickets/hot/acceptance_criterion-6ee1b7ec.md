---
uid: acceptance_criterion-6ee1b7ec
id: AC-676
type: acceptance_criterion
title: Send button resets to 'Send' and re-enables after the turn resolves or rejects
created_by: xgd
created_at: '2026-06-28T22:13:04.515352+00:00'
updated_at: '2026-06-28T22:13:04.515352+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the in-flight turn settles, the Send button returns to its "Send" label and re-enables. This holds whether `onSend` resolves OR rejects: a rejected turn still clears the busy state (it is cleared in a `finally`), so a failed send never strands the button in a permanently disabled/spinning state, and a rejected `onSend` does not surface as an unhandled promise rejection on the page.

## Verification

Render the chat panel twice: once with an `onSend` that resolves and once with an `onSend` that rejects. In each case submit non-empty input, await the turn settling, and assert the `[data-fc-chat-send]` button is no longer `disabled`, has had `aria-busy` and `data-fc-chat-send-busy` removed, and shows the "Send" label again. For the rejecting case, assert no unhandled rejection is raised.
