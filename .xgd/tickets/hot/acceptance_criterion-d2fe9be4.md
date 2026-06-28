---
uid: acceptance_criterion-d2fe9be4
id: AC-657
type: acceptance_criterion
title: remove_page refuses to delete the only remaining page
created_by: xgd
created_at: '2026-06-28T20:48:02.076098+00:00'
updated_at: '2026-06-28T20:48:02.076098+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Removing a page when the site has only one page is rejected with a structured failure carrying the reason `cannot_remove_only_page`, and the single page is retained.

## Verification
On a single-page site, apply remove_page for `/`; assert the result is a failure whose error message contains `cannot_remove_only_page`, and the site still has its one page.
