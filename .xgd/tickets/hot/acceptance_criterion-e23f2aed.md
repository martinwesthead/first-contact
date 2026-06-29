---
uid: acceptance_criterion-e23f2aed
id: AC-673
type: acceptance_criterion
title: Send button is disabled with a CSS-only spinner and aria-busy while a turn
  is in flight
created_by: xgd
created_at: '2026-06-28T22:12:50.035094+00:00'
updated_at: '2026-06-29T22:01:13.283410+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The in-flight affordance is a round Send→Stop swap, not a CSS spinner. The chat input capsule carries a round accent **Send** button (`[data-fc-chat-send]`, play `▶` glyph) positioned at its right edge. While a chat turn is in flight (after a send is submitted and before `onSend` settles) the Send button is hidden — it gains a `data-fc-chat-send-busy` attribute — and a round red **Stop** button (`[data-fc-chat-stop]`, square `■` glyph) is revealed in the same position via a `data-fc-chat-stop-visible` attribute. No CSS-only spinner overlay is shown (the prior `.fc-chat__send-spinner` rule is removed). The input row does not reflow when the buttons swap.

## Verification

Render the builder chat panel with an `onSend` that returns a pending (unresolved) promise, trigger a send with non-empty input, and assert that `[data-fc-chat-send]` carries the `data-fc-chat-send-busy` attribute and is hidden while `[data-fc-chat-stop]` carries `data-fc-chat-stop-visible` and is shown. Assert the shipped `apps/control-app/public/builder.html` stylesheet defines round `.fc-chat__send` and `.fc-chat__stop` rules and no longer defines the `.fc-chat__send-spinner` rotation rule.
