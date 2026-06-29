---
uid: acceptance_criterion-b0f2b96a
id: AC-762
type: acceptance_criterion
title: logo-strip is registered in the framework catalog as logo-strip@v1
created_by: xgd
created_at: '2026-06-29T23:44:55.819359+00:00'
updated_at: '2026-06-29T23:44:55.819359+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
The framework module catalog exposes a module whose id is `logo-strip` at version `1`. Requesting that module from the catalog returns an entry that declares id `logo-strip`, version `1`, and supports the variants `logos` and `features`; the same module appears in the list of registered modules.

## Verification
Look up `logo-strip` version 1 through the catalog's public lookup contract and assert the returned entry reports id `logo-strip`, version `1`, and includes both `logos` and `features` among its variants. Assert the registered-module listing contains `{ id: "logo-strip", version: 1 }`.
