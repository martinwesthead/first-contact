---
uid: acceptance_criterion-2d45b4ec
id: AC-707
type: acceptance_criterion
title: set_nav_entries rejects an entry targeting an unknown page id
created_by: xgd
created_at: '2026-06-28T23:53:43.137122+00:00'
updated_at: '2026-06-28T23:53:43.137122+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
A `set_nav_entries` call containing a `page` target whose `pageId` does not resolve to an existing page is rejected with a structured error, and the nav is left unchanged.

## Verification
Apply `set_nav_entries` with a page-target entry referencing a non-existent page id and assert the call is rejected with an error identifying the orphan nav target.