---
uid: acceptance_criterion-d1a4395c
id: AC-742
type: acceptance_criterion
title: split-section is registered and resolvable in the module catalog with both
  variants
created_by: xgd
created_at: '2026-06-29T23:13:05.617493+00:00'
updated_at: '2026-06-29T23:13:05.617493+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
The framework module catalog includes a module identified as `split-section` at version 1. Requesting that module by id and version returns a usable catalog entry whose rendering component is callable and whose metadata declares exactly the two layout variants `image-left` and `image-right`. The catalog's list of registered modules contains the `{ id: "split-section", version: 1 }` entry.

## Verification
Query the catalog's registered-module list and confirm it contains split-section v1. Resolve the module by id+version and assert a renderable component is returned and that its declared variants include both `image-left` and `image-right`.
