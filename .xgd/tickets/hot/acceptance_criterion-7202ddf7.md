---
uid: acceptance_criterion-7202ddf7
id: AC-661
type: acceptance_criterion
title: reorder_pages rejects a list containing a duplicate slug
created_by: xgd
created_at: '2026-06-28T20:48:23.032673+00:00'
updated_at: '2026-06-28T20:48:23.032673+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Reordering pages with a list that repeats any slug (even when the list length matches the page count) is rejected with a structured failure, and the page order is left unchanged.

## Verification
On a two-page site (`/`, `/menu`), apply reorder_pages with `['/', '/', '/menu']`; assert the result is a failure and the page order is unchanged.
