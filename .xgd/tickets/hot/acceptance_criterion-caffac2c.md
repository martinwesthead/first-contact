---
uid: acceptance_criterion-caffac2c
id: AC-749
type: acceptance_criterion
title: testimonials is registered and resolvable in the module catalog with single
  and grid variants
created_by: xgd
created_at: '2026-06-29T23:20:55.561870+00:00'
updated_at: '2026-06-29T23:20:55.561870+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
The framework module catalog includes a module identified as `testimonials` at version 1. Requesting that module by id and version returns a usable catalog entry whose rendering component is callable, and whose metadata declares exactly the two variants `single` and `grid`. The catalog's list of registered modules contains the `{ id: "testimonials", version: 1 }` entry.

## Verification
Query the catalog's registered-module list and confirm it contains testimonials v1. Resolve the module by id+version and assert a renderable component is returned and that its declared variants are exactly `single` and `grid`.
