---
uid: acceptance_criterion-36a76bf6
id: AC-412
type: acceptance_criterion
title: Registry surfaces a catalog-miss error for an unknown module id
created_by: xgd
created_at: '2026-06-25T00:56:32.363673+00:00'
updated_at: '2026-06-25T00:56:32.363673+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Looking up a module by an id that is not in the catalog produces a catalog-miss error. The error identifies the requested module id and lists the modules that are available so a caller can diagnose the typo or missing registration.

## Verification

Attempt to resolve a module with an id that is not registered (e.g. an obviously-fake id). Assert the operation raises an error of the catalog-miss type, that the error message names the unknown id, and that the message includes a description of the modules that are currently registered.
