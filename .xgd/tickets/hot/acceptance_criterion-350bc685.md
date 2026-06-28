---
uid: acceptance_criterion-350bc685
id: AC-429
type: acceptance_criterion
title: Services-grid three-col variant renders three columns at and above the md breakpoint
created_by: xgd
created_at: '2026-06-25T01:11:35.637708+00:00'
updated_at: '2026-06-28T20:58:03.466881+00:00'
completed_at: null
last_field_updated: uat_coverage
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

When a services-grid is rendered with the `three-col` variant and viewport widths at or above the framework's `md` breakpoint, its items lay out in three columns.

## Verification

Render a services-grid with `variant: "three-col"` and three or more items; assert the rendered markup contains a layout rule applying a three-column grid at the `md` breakpoint and above (e.g. via a media-query rule keyed to the `md` width).