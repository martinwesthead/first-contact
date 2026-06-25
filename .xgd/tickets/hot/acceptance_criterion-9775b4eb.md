---
uid: acceptance_criterion-9775b4eb
id: AC-401
type: acceptance_criterion
title: Duplicate module IDs within a page are rejected
created_by: xgd
created_at: '2026-06-25T00:39:30.593304+00:00'
updated_at: '2026-06-25T00:39:30.593304+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

Module IDs must be unique within their page. When a page contains
two or more `ModuleInstance` entries sharing the same `id`,
`validateSite()` returns the failure branch with an error whose
JSON-pointer path locates the duplicate (for example
`/pages/0/modules/1/id`) and whose message identifies the
duplication.

## Verification

Build a page containing two modules with the same `id`, call
`validateSite()`, and assert the failure branch is returned and
the error list contains an entry pointing at the duplicate
module's `id` field.
