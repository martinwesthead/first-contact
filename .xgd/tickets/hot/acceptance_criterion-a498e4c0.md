---
uid: acceptance_criterion-a498e4c0
id: AC-837
type: acceptance_criterion
title: Degraded preview digest (no screenshots) renders signal panels only, with no
  screenshot strip and no error
created_by: xgd
created_at: '2026-06-30T06:25:32.333044+00:00'
updated_at: '2026-06-30T06:25:32.333044+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When a preview digest has no screenshots (the degraded/budget-exhausted shape), its chat card renders without a screenshot strip — showing the structural signal panels only — and does not error.

## Verification
Render the card from a preview digest payload whose screenshot keys are empty; assert no screenshot strip element is present, the signal content still renders, and rendering completes without error.
