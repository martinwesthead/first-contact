---
uid: acceptance_criterion-831ce4c9
id: AC-732
type: acceptance_criterion
title: Bare Enter sends the message; Enter with any modifier inserts a newline
created_by: xgd
created_at: '2026-06-29T22:01:44.717777+00:00'
updated_at: '2026-06-29T22:01:44.717777+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat input honors a bare-Enter-to-send keyboard contract. Pressing **Enter** with no modifier submits the current message (equivalent to clicking Send). Pressing **Enter** together with any modifier — Shift, Alt, Meta (Cmd), or Ctrl — does NOT submit; it inserts a newline into the editor. The placeholder text advertises the contract ("Type a message... (Enter to send, Shift+Enter for newline)"). A bare Enter on empty input no-ops (no submission), and a bare Enter while a turn is already in flight does not fire a second send.

## Verification

Mount the chat panel with an `onSend` spy and non-empty input. Dispatch a bare `Enter` keydown and assert `onSend` is invoked once. Reset, then dispatch `Enter` with `shiftKey`, again with `metaKey`, with `ctrlKey`, and with `altKey`, asserting in each case that `onSend` is NOT invoked and a newline is inserted into the editor content. Assert the rendered placeholder text mentions "Enter to send". Dispatch a bare Enter on empty input and assert no submission; dispatch a bare Enter during an in-flight (pending `onSend`) turn and assert no second `onSend`.
