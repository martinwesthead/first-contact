---
uid: acceptance_criterion-5e29020d
id: AC-402
type: acceptance_criterion
title: Duplicate page slugs within a site are rejected
created_by: xgd
created_at: '2026-06-25T00:39:32.995614+00:00'
updated_at: '2026-06-25T00:39:32.995614+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

Page slugs must be unique within their site. When two or more
pages share the same `slug`, `validateSite()` returns the failure
branch with an error whose JSON-pointer path locates the
duplicate (for example `/pages/1/slug`) and whose message
identifies the duplication.

## Verification

Build a site containing two pages with the same `slug`, call
`validateSite()`, and assert the failure branch is returned and
the error list contains an entry pointing at the duplicate
page's `slug` field.
