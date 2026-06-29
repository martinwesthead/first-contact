---
uid: acceptance_criterion-7b63f602
id: AC-739
type: acceptance_criterion
title: Image-gallery columns dial maps to a modifier class and collapses to one column
  below md
created_by: xgd
created_at: '2026-06-29T22:34:39.087802+00:00'
updated_at: '2026-06-29T22:34:39.087802+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The image-gallery `columns` dial (`2`, `3`, or `4`) maps to a corresponding `fc-image-gallery--cols-<n>` modifier class on the section, defaulting to `cols-3` when the dial is omitted. The selected column count applies at and above the `md` (768px) breakpoint; below `md` the gallery collapses to a single column for every `columns` value.

## Verification

Render an image-gallery for each `columns` value (2, 3, 4) and assert the matching `fc-image-gallery--cols-<n>` class is emitted; render one with the dial omitted and assert `fc-image-gallery--cols-3`. Assert the layout rules apply the chosen column count at and above the `md` breakpoint and a single column below it.
