---
uid: acceptance_criterion-ea58fc85
id: AC-430
type: acceptance_criterion
title: Services-grid two-col variant renders two columns at and above the md breakpoint
created_by: xgd
created_at: '2026-06-25T01:11:38.228367+00:00'
updated_at: '2026-06-25T01:11:38.228367+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a services-grid is rendered with the `two-col` variant and viewport widths at or above the framework's `md` breakpoint, its items lay out in two columns.

## Verification

Render a services-grid with `variant: "two-col"` and two or more items; assert the rendered markup contains a layout rule applying a two-column grid at the `md` breakpoint and above.
