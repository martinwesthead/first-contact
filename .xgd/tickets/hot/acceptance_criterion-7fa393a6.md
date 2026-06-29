---
uid: acceptance_criterion-7fa393a6
id: AC-766
type: acceptance_criterion
title: logo-strip emits optional heading, label, and href markup only when those fields
  are present
created_by: xgd
created_at: '2026-06-29T23:45:07.551036+00:00'
updated_at: '2026-06-29T23:45:07.551036+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
Optional content is rendered only when supplied:
- A `heading`, when present, is rendered as a section heading (h2 treatment, matching services-grid); when absent, no heading element is emitted.
- An item `label`, when present on the `features` variant, is rendered as visible label text; when absent, no label element is emitted for that item. On the `logos` variant the label is never rendered visibly.
- In all variants, when an item carries a `label` it is used as the image's alt text; when absent the image's own alt text is used.

## Verification
Render with and without a `heading` and assert the heading element appears only when supplied. Render `features` items with and without labels and assert the visible label element appears only for items that carry a label. Assert that for any item with a label, the rendered image's alt attribute equals that label.
