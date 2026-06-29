---
uid: acceptance_criterion-07db2e7a
id: AC-750
type: acceptance_criterion
title: grid variant renders one card per item and tags the section data-variant=grid
created_by: xgd
created_at: '2026-06-29T23:20:58.895409+00:00'
updated_at: '2026-06-29T23:20:58.895409+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
When rendered with the `grid` variant and a list of N testimonial items, the module produces exactly N testimonial cards — one per supplied item — and tags the rendered section so it is identifiable as the grid variant (the section carries `data-variant="grid"`). Each item's attribution name appears in the output. The grid is static; no carousel/rotation behavior is present.

## Verification
Render the module with the `grid` variant and three items; assert the section is marked `data-variant="grid"`, that exactly three testimonial cards are emitted, and that all three attribution names appear in the rendered output.
