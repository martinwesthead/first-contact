---
uid: acceptance_criterion-81aebf6e
id: AC-731
type: acceptance_criterion
title: Collapsible tool-use pane above the message list shows live tool events with
  inline ChatCards retained
created_by: xgd
created_at: '2026-06-29T22:01:41.934914+00:00'
updated_at: '2026-06-29T22:01:41.934914+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

A collapsible tool-use pane sits above the chat message list and shows the AI's live tool activity for the current turn. The pane has a header (`[data-fc-chat-tool-header]`) with a chevron that flips between `▶` (collapsed, the default) and `▼` (expanded); clicking the header — or activating it with Enter/Space — toggles the pane open and closed. As each tool call is dispatched during a turn, a row describing it is appended to the pane body and the pane is auto-expanded; the pane is reset at the start of each new turn. Inline `ChatCard` tool-result renderers in the message list are retained alongside the pane — the pane is the live "what the AI is doing now" view, while the inline cards remain the durable per-result artefacts.

## Verification

Render the builder chat panel and assert the tool-pane (`[data-fc-chat-tool-pane]`) is present and collapsed by default with a `▶` chevron. Click the header and assert the pane expands and the chevron flips to `▼`; click again and assert it collapses. Invoke the panel's tool-event API (append a tool event) and assert a new row appears in the pane body in dispatch order and the pane is expanded. Reset the tool events and assert the pane body is cleared. Assert an inline `ChatCard` result still renders in the message list for a completed tool result (both surfaces coexist).
