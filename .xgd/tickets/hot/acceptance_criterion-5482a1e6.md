---
uid: acceptance_criterion-5482a1e6
id: AC-675
type: acceptance_criterion
title: Chat editor stays editable while a turn is in flight
created_by: xgd
created_at: '2026-06-28T22:13:01.733934+00:00'
updated_at: '2026-06-28T22:13:01.733934+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

While a chat turn is in flight, the chat input editor remains focusable and editable, so the operator can compose their next message even though the Send button is locked. Only the Send button enters the disabled/busy state — the editor is never disabled.

## Verification

Render the chat panel with an `onSend` that returns a pending promise, submit non-empty input to enter the busy state, then assert the editor element (`[data-fc-chat-input]` / its content editable region) is still editable — it accepts focus and typed input and is not marked disabled — while the Send button is disabled.
