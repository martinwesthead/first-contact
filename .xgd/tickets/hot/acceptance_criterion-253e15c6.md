---
uid: acceptance_criterion-253e15c6
id: AC-711
type: acceptance_criterion
title: set_page_metadata renames a page via new_slug while keeping its id stable
created_by: xgd
created_at: '2026-06-28T23:53:53.729505+00:00'
updated_at: '2026-06-28T23:53:53.729505+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `set_page_metadata` with `new_slug` renames the page's slug to the canonical `/<new_slug>` while leaving the page's `id` unchanged, so nav entries that reference the page by id continue to resolve after the rename.

## Verification
Add a nav entry targeting a page by id, rename that page via `set_page_metadata` `new_slug`, and assert the page slug changed, the page id is unchanged, and the nav entry still resolves (site still validates).