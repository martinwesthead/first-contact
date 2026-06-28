---
uid: acceptance_criterion-b7c3f92c
id: AC-674
type: acceptance_criterion
title: Repeat send during an in-flight turn fires no second onSend; empty input no-ops
  first
created_by: xgd
created_at: '2026-06-28T22:12:58.928681+00:00'
updated_at: '2026-06-28T22:12:58.928681+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

A second send attempt made while a turn is already in flight — whether by clicking the Send button again or pressing Cmd/Ctrl+Enter — does not fire a second `onSend` call; the in-flight turn is left to complete on its own. An empty input still no-ops on send before the busy state is ever entered (it neither calls `onSend` nor disables the button).

## Verification

Render the chat panel with a spy `onSend` that returns a pending promise. Submit non-empty input once (the first `onSend` fires), then click Send again and dispatch Cmd/Ctrl+Enter while still pending — assert `onSend` was called exactly once. Separately, with an empty editor, click Send and assert `onSend` was not called and the button never entered the busy/disabled state.
