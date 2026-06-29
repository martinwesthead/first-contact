---
uid: acceptance_criterion-6ee1b7ec
id: AC-676
type: acceptance_criterion
title: Send button resets to 'Send' and re-enables after the turn resolves or rejects
created_by: xgd
created_at: '2026-06-28T22:13:04.515352+00:00'
updated_at: '2026-06-29T22:01:13.857560+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the in-flight turn settles, the Stop button is hidden again and the Send button is restored. This holds whether `onSend` resolves OR rejects: a rejected turn still clears the busy state (cleared in a `finally`), so a failed send never strands the controls in a permanently Stop-showing state, and a rejected `onSend` does not surface as an unhandled promise rejection on the page. Clicking **Stop** while the turn is in flight invokes the panel's `onStop` handler, which the chat driver wires to the per-turn `AbortController` so the SSE reader and the upstream Anthropic request are aborted.

## Verification

Render the chat panel twice: once with an `onSend` that resolves and once with an `onSend` that rejects. In each case submit non-empty input, await the turn settling, and assert that `[data-fc-chat-send]` no longer has `data-fc-chat-send-busy` (Send is shown again) and `[data-fc-chat-stop]` no longer has `data-fc-chat-stop-visible` (Stop is hidden). For the rejecting case, assert no unhandled rejection is raised. Separately, render with a pending `onSend` and an `onStop` spy, enter the busy state, click `[data-fc-chat-stop]`, and assert `onStop` is invoked.
