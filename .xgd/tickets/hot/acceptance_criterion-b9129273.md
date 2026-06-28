---
uid: acceptance_criterion-b9129273
id: AC-658
type: acceptance_criterion
title: remove_page rejects an unknown slug
created_by: xgd
created_at: '2026-06-28T20:48:04.744329+00:00'
updated_at: '2026-06-28T20:48:04.744329+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Removing a page whose slug does not exist in the site is rejected with a structured failure indicating the page was not found, and the page list is left unchanged.

## Verification
On a multi-page site, apply remove_page for `/nonexistent`; assert the result is a failure whose message indicates the page was not found, and the page count is unchanged.
