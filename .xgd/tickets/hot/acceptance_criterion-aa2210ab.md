---
uid: acceptance_criterion-aa2210ab
id: AC-685
type: acceptance_criterion
title: A markdown content field accepts an inline string or a text asset reference
created_by: xgd
created_at: '2026-06-28T22:54:29.607959+00:00'
updated_at: '2026-06-28T22:54:29.607959+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
A module content field declared as markdown accepts EITHER an inline markdown string OR a text-kind asset reference, on a per-instance basis. Both forms pass whole-site validation for the same field.

## Verification
Validate a site definition where one markdown field is set to an inline string and, separately, where the same field is set to a text asset reference. Assert both site definitions validate successfully.