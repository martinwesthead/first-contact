---
uid: acceptance_criterion-124efa23
id: AC-583
type: acceptance_criterion
title: ChatCard primitive renders header, body, actions, collapse, and one of five
  tones
created_by: xgd
created_at: '2026-06-27T00:55:21.417433+00:00'
updated_at: '2026-06-27T00:55:21.417433+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

A reusable chat-card primitive renders structured content inside the chat message flow with a consistent shell: a header containing an optional leading icon and a title; a body slot accepting text or arbitrary DOM content; an optional actions row of buttons whose click invokes the supplied callback; and an optional collapse caret that, when toggled, hides/shows the body (and actions) and reports the new collapsed state. The card carries exactly one of five tones — neutral, info, success, warning, danger — which applies a visible tone accent. Collapse state and tone are observable on the rendered card.

## Verification

Create a card with a title, icon, body content, and two actions, and assert the rendered DOM shows the title and icon in the header, the body content in the body slot, and a button per action. Click an action button and assert its callback fires. Create a card with a collapse toggle, click the caret, and assert the body is hidden and the reported collapsed state flips (and toggling again restores it). Create cards with each of the five tones and assert the tone is reflected on the card (e.g. via a tone attribute/class), and that exactly one tone applies.
