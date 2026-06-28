---
uid: acceptance_criterion-f59ca6eb
id: AC-671
type: acceptance_criterion
title: Builder chat input editor renders visibly with Send positioned to its right
created_by: xgd
created_at: '2026-06-28T21:04:01.880364+00:00'
updated_at: '2026-06-28T21:04:01.880364+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the builder loads, the chat input renders as a visible text-entry editor positioned correctly in its row. The editor element (`[data-fc-chat-input]`) has non-zero rendered width and height — a bordered, dark-background field that fills the available width of the input row and highlights its border on focus — and the Send button (`[data-fc-chat-send]`) stays compact and sits to the right of the editor (`[ editor ][ Send ]`). The editor is never collapsed to zero size and the Send button never takes over the row in place of the input.

## Verification

Render the builder SPA and assert the `[data-fc-chat-input]` editor element is present with non-zero `getBoundingClientRect()` width and height, and that the `[data-fc-chat-send]` button's left edge is greater than the editor element's left edge (Send sits to the right). Assert the shipped `apps/control-app/public/builder.html` stylesheet defines `.fc-chat__editor` and `.fc-chat__editor-content` rules and no longer references the removed `.fc-chat__textarea` selector.
