---
uid: acceptance_criterion-e1ab4223
id: AC-582
type: acceptance_criterion
title: Chat input is a markdown-aware rich-text editor with markdown round-trip on
  send
created_by: xgd
created_at: '2026-06-27T00:55:18.522369+00:00'
updated_at: '2026-06-27T00:55:18.522369+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat input is a rich-text editor (not a plain `<textarea>`) that understands markdown: pasting markdown source into the editor renders it as formatted text (e.g. a heading and bold text display with their formatting rather than as literal `#`/`**` characters), the message is sent on Cmd/Ctrl+Enter (and via the Send button), and on submission the editor content is serialized back to markdown — that markdown string is the payload sent to `/api/chat`. The editor clears after a successful send and empty submissions are ignored.

## Verification

Mount the chat panel, paste `# Title\n\n**bold**` into the input editor, and assert the editor's rendered DOM shows a heading and bold styling (not literal markdown punctuation). Trigger submission (Cmd/Ctrl+Enter or Send) with the `onSend` callback stubbed and assert the callback receives a markdown string (containing `# Title` / `**bold**`), not HTML. Assert the editor is cleared after send and that submitting an empty editor does not invoke `onSend`.
