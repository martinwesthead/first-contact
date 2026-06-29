---
uid: acceptance_criterion-9033a766
id: AC-737
type: acceptance_criterion
title: Image-gallery masonry variant uses a pure-CSS column-count layout
created_by: xgd
created_at: '2026-06-29T22:34:17.786731+00:00'
updated_at: '2026-06-29T22:34:17.786731+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When an image-gallery is rendered with the `masonry` variant, the section is tagged `data-variant="masonry"` and carries the `fc-image-gallery--variant-masonry` class, which drives a pure-CSS `column-count` (masonry) layout with no client-side JavaScript or hydration. One figure is emitted per content item, and natural image aspect ratios are allowed to flow (no 1:1 lock).

## Verification

Render an image-gallery with `variant: "masonry"` and N items. Assert the markup is tagged `data-variant="masonry"`, carries the `fc-image-gallery--variant-masonry` class, emits N figures, and that the masonry layout is achieved via CSS `column-count` rules rather than emitted client JS.
