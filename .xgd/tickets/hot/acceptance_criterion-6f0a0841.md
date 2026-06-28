---
uid: acceptance_criterion-6f0a0841
id: AC-708
type: acceptance_criterion
title: set_nav_entries rejects an anchor entry targeting an unknown module id
created_by: xgd
created_at: '2026-06-28T23:53:45.751427+00:00'
updated_at: '2026-06-28T23:53:45.751427+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
A `set_nav_entries` call containing an `anchor` target whose `pageId`+`moduleId` does not resolve to a real module on that page is rejected with a structured error, and the nav is left unchanged.

## Verification
Apply `set_nav_entries` with an anchor-target entry referencing a non-existent module id (or a module not on the referenced page) and assert the call is rejected with an error identifying the orphan anchor target.