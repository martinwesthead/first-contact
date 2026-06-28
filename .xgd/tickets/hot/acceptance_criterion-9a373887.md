---
uid: acceptance_criterion-9a373887
id: AC-660
type: acceptance_criterion
title: reorder_pages rejects a list that omits a page
created_by: xgd
created_at: '2026-06-28T20:48:20.236580+00:00'
updated_at: '2026-06-28T20:48:20.236580+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Reordering pages with a list that does not include every existing page (a count mismatch) is rejected with a structured failure, and the page order is left unchanged.

## Verification
On a two-page site, apply reorder_pages with a single-element list such as `['/']`; assert the result is a failure and the page order is unchanged.
