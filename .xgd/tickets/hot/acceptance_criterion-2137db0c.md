---
uid: acceptance_criterion-2137db0c
id: AC-654
type: acceptance_criterion
title: add_page rejects a duplicate slug
created_by: xgd
created_at: '2026-06-28T20:47:40.600163+00:00'
updated_at: '2026-06-28T20:47:40.600163+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Adding a page whose canonical slug already exists in the site is rejected with a structured failure indicating the page already exists, and the page list is left unchanged.

## Verification
Add a page `menu`, then apply add_page again with slug `menu`; assert the second call returns a failure whose message indicates a duplicate/already-existing page, and the page count does not increase.
