---
uid: acceptance_criterion-2e0fa595
id: AC-395
type: acceptance_criterion
title: Missing required theme-token slot is rejected with the slot's JSON-pointer
  path
created_by: xgd
created_at: '2026-06-25T00:38:53.815408+00:00'
updated_at: '2026-06-25T00:38:53.815408+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

The theme-token surface enforces slot completeness: every slot in
the locked superset must be present. When any required slot is
omitted (e.g. `palette.primary` deleted, or `spacing.4` deleted),
`validateSite()` returns the failure branch with an error whose
JSON-pointer `path` names the missing slot (for example
`/theme/palette/primary` or `/theme/spacing/4`).

## Verification

For each token group, mutate a known-good site to delete a
required slot, call `validateSite()`, and assert the failure
branch is returned and the error list contains the JSON-pointer
path for the deleted slot.
