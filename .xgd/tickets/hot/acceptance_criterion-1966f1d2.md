---
uid: acceptance_criterion-1966f1d2
id: AC-656
type: acceptance_criterion
title: remove_page deletes the page and strips nav entries pointing at it
created_by: xgd
created_at: '2026-06-28T20:47:58.901252+00:00'
updated_at: '2026-06-28T20:47:58.901252+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Removing a page by its slug yields a site without that page, and any navigation entries that targeted the removed page are removed at the same time, so the resulting site contains no navigation reference to a missing page.

## Verification
On a two-page site (`/` and `/menu`) with a nav entry targeting the menu page, apply remove_page for `/menu`; assert the resulting page list is `['/']` and the navigation entry list is empty.
