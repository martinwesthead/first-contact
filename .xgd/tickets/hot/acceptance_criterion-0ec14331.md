---
uid: acceptance_criterion-0ec14331
id: AC-427
type: acceptance_criterion
title: Text-block renders markdown body content including headings, lists, links,
  images, blockquotes, and code blocks
created_by: xgd
created_at: '2026-06-25T01:11:23.580706+00:00'
updated_at: '2026-06-25T01:11:23.580706+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a text-block's body content includes markdown features (a heading, an unordered or ordered list, a link, an image, a blockquote, and a code block), the rendered output emits the corresponding HTML elements inside the text-block's body region.

## Verification

Render a text-block whose body contains each of these markdown features and assert that the rendered output contains the corresponding HTML elements (heading tag, list and list-item tags, anchor, image, blockquote, code element) within the text-block's body region.
