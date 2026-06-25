---
uid: acceptance_criterion-de6da419
id: AC-431
type: acceptance_criterion
title: Services-grid collapses to a single column at viewports below the md breakpoint
created_by: xgd
created_at: '2026-06-25T01:11:40.966688+00:00'
updated_at: '2026-06-25T01:11:40.966688+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a services-grid is rendered with either variant, at viewport widths below the framework's `md` breakpoint its items lay out in a single column.

## Verification

Render a services-grid with either variant; assert the rendered markup applies a single-column layout as the default (below the `md` breakpoint media query), independent of variant.
