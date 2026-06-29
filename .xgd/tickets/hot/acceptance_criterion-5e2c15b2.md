---
uid: acceptance_criterion-5e2c15b2
id: AC-754
type: acceptance_criterion
title: quote content renders as HTML rather than escaped text
created_by: xgd
created_at: '2026-06-29T23:21:21.902361+00:00'
updated_at: '2026-06-29T23:21:21.902361+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
A testimonial item's `quote` is rendered as live HTML markup in the output rather than as escaped text. Inline formatting present in the quote (for example a bold span) appears in the rendered output as the corresponding HTML element, and the literal escaped form of that markup does not appear.

## Verification
Render an item whose quote contains an inline formatting element (e.g. a `<strong>` span) and assert the rendered output contains that element as live markup, and does not contain its escaped textual equivalent.
