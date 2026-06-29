---
uid: acceptance_criterion-5ee4d404
id: AC-733
type: acceptance_criterion
title: Chat input is a rounded-pill 13px capsule with markdown typography and an Enter-to-send
  placeholder hint
created_by: xgd
created_at: '2026-06-29T22:01:47.509224+00:00'
updated_at: '2026-06-29T22:01:47.509224+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat input renders as a single rounded-pill capsule matching the XGD dashboard chat widget. The chat region uses 13px typography (`.fc-chat` declares `font-size: 13px` with a comfortable line-height), and the editor (`.fc-chat__editor`) is a `border-radius: 24px` capsule with a single border that highlights with an accent colour on focus and a min-height around a single line that grows up to a bounded max-height. Pasted-markdown content inside the editor is styled with markdown typography (headings, lists, blockquote, code/pre, and tables render with formatting). A placeholder hint is shown when the editor is empty, advertising the Enter-to-send contract. The round Send/Stop button is positioned inside the capsule at its right edge, and the editor content is padded to clear that button.

## Verification

Render the builder SPA and assert the `[data-fc-chat-input]` editor element is present with non-zero rendered width and height. Assert the shipped `apps/control-app/public/builder.html` stylesheet declares `font-size: 13px` for the chat region, a `border-radius: 24px` (or equivalent rounded-pill radius) and a focus-accent rule on `.fc-chat__editor`, and markdown-typography rules on `.fc-chat__editor-content` (headings/lists/pre/code/table). Assert an empty editor shows the placeholder hint text mentioning "Enter to send".
