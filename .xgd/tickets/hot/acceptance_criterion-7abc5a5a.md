---
uid: acceptance_criterion-7abc5a5a
id: AC-659
type: acceptance_criterion
title: reorder_pages applies a full page permutation
created_by: xgd
created_at: '2026-06-28T20:48:17.439214+00:00'
updated_at: '2026-06-28T20:48:17.439214+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Reordering pages with a list that contains every existing page slug exactly once produces a site whose page order matches the supplied sequence.

## Verification
On a site with pages `/`, `/menu`, `/contact`, apply reorder_pages with `['/', '/contact', '/menu']`; assert the resulting page order is exactly `/`, `/contact`, `/menu`.
