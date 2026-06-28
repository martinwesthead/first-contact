---
uid: acceptance_criterion-ce4c7fed
id: AC-691
type: acceptance_criterion
title: Source HTML is mechanically converted to verbatim markdown over the standard
  subset
created_by: xgd
created_at: '2026-06-28T22:54:45.754493+00:00'
updated_at: '2026-06-28T22:54:45.754493+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
Converting source body HTML to markdown preserves the standard content subset — headings, paragraphs, lists, emphasis, links, images, inline code, and blockquotes — and silently drops scripts, styles, custom classes, and inline style attributes. The conversion is mechanical (no language model in the text path).

## Verification
Convert a representative HTML fragment such as `<h1>Hi</h1><p>Body <strong>bold</strong></p>` and assert the result is valid markdown equivalent to `# Hi` followed by `Body **bold**`. Convert a fragment carrying `class`, `style`, and `<script>` and assert those are absent from the output while the content subset survives.