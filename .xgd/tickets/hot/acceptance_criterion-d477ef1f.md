---
uid: acceptance_criterion-d477ef1f
id: AC-413
type: acceptance_criterion
title: Registry surfaces a catalog-miss error for an unknown version of a known module
created_by: xgd
created_at: '2026-06-25T00:56:36.142845+00:00'
updated_at: '2026-06-25T00:56:36.142845+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Looking up a known module id at a version that is not registered produces a catalog-miss error. The error identifies the requested id and the set of versions that are available for that id, distinguishing this case from an unknown id.

## Verification

Attempt to resolve a known module (e.g. header) at a version that does not exist (e.g. version 99). Assert the operation raises an error of the catalog-miss type and that the error message names the requested id and lists the version(s) that are actually registered for that id.
