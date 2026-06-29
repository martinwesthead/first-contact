---
uid: acceptance_criterion-e1b325f2
id: AC-581
type: acceptance_criterion
title: Assistant and user messages render as sanitized markdown; system messages stay
  plaintext
created_by: xgd
created_at: '2026-06-27T00:55:15.849037+00:00'
updated_at: '2026-06-29T22:02:14.442796+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

Both assistant and user chat messages are rendered as sanitized markdown in the chat log: markdown headers, lists, and fenced code blocks appear as their corresponding DOM elements (e.g. `<h2>`, `<ul><li>`, `<pre><code>`); links are rendered to open in a new tab with `rel="noopener noreferrer"`; and any injected raw HTML is sanitized so `<script>` tags and `on*=` event-handler attributes are stripped and never reach the DOM. Only system-role messages are NOT markdown-rendered — they are shown verbatim as plaintext (they are sentinel strings emitted by the chat driver, not operator/AI prose).

## Verification

Render an assistant message containing `## Heading`, a `- list item`, a fenced code block, and a markdown link, and assert the chat DOM contains a heading element, a list item, a `<pre><code>` block, and an anchor whose `target` is `_blank` and `rel` includes `noopener noreferrer`. Render a user message containing markdown (`**bold**`, a heading) and assert it renders formatted (a `<strong>`/heading element, not literal `**`/`#` characters). Render a message (either role) containing `<script>alert(1)</script>` and an element with an `onerror=` attribute and assert neither a `<script>` element nor the event-handler attribute is present in the resulting DOM. Render a system message containing markdown syntax and assert it appears as literal plaintext (no heading/list elements produced).