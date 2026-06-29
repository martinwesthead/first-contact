---
uid: acceptance_criterion-43ab7ff3
id: AC-736
type: acceptance_criterion
title: Image-gallery grid variant renders one tile per item and tags the section data-variant=grid
created_by: xgd
created_at: '2026-06-29T22:34:05.261218+00:00'
updated_at: '2026-06-29T22:34:05.261218+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When an image-gallery is rendered with the `grid` variant, the section is tagged `data-variant="grid"` (and carries the `fc-image-gallery--variant-grid` class), and exactly one image tile is emitted per content item. Each image renders as a plain `<img>` with `loading="lazy"` and `decoding="async"` whose source matches the item's image asset; grid tiles are locked to a 1:1 aspect ratio.

## Verification

Render an image-gallery with `variant: "grid"` and N items (e.g. N=4). Assert the markup is tagged `data-variant="grid"`, that exactly N image tiles/figures are present, that each item's image source appears, and that the images carry `loading="lazy"`.
