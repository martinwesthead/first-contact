---
uid: acceptance_criterion-913a928b
id: AC-414
type: acceptance_criterion
title: Registry exposes the full list of registered modules
created_by: xgd
created_at: '2026-06-25T00:56:38.625835+00:00'
updated_at: '2026-06-25T00:56:38.625835+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

The registry exposes an enumeration of every registered module as `{id, version}` pairs. Every chrome module appears in this enumeration at the version it was registered at.

## Verification

Read the registered-module enumeration and assert it contains entries for header, hero, and footer at the versions each module declares in its meta. Assert each entry is a `{id, version}` pair.
