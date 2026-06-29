---
uid: acceptance_criterion-ccdbcd78
id: AC-761
type: acceptance_criterion
title: banner applies default dials (left align, spacing 6) when dials are omitted
created_by: xgd
created_at: '2026-06-29T23:37:49.094587+00:00'
updated_at: '2026-06-29T23:37:49.094587+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
When dials are not specified, the banner renders with its documented defaults: `align` = left, `surface` = default, `size` = md, and `spacingTop` = `spacingBottom` = 6 (tighter than the hero default of 12 so banners sit between sections).

## Verification
Render a banner with no dials supplied; assert the published section reflects the default alignment, surface, size, and the default top/bottom spacing of 6.
