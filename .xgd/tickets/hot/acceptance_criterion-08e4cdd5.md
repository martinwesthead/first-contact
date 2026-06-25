---
uid: acceptance_criterion-08e4cdd5
id: AC-397
type: acceptance_criterion
title: Catalog membership is NOT validated (module type/variant/dial are framework's
  concern)
created_by: xgd
created_at: '2026-06-25T00:39:02.374278+00:00'
updated_at: '2026-06-25T00:39:02.374278+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

The schema deliberately does NOT validate catalog membership. A
site whose module `type` is unknown to any framework catalog
(e.g. `'totally-fake-module'`), whose `variant` is not declared
anywhere, or whose dial value is not a valid catalog enum still
passes `validateSite()`. This documents the boundary: the schema
validates structure; the framework enforces catalog correctness
at render time.

## Verification

For each of: unknown module `type`, undeclared `variant`,
arbitrary dial value, mutate a known-good site fixture and assert
`validateSite()` returns the success branch.
