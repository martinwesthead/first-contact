---
uid: acceptance_criterion-4f1c38a5
id: AC-773
type: acceptance_criterion
title: Image-gallery imageSize dial caps image height in the masonry variant only
created_by: xgd
created_at: '2026-06-30T00:02:49.280234+00:00'
updated_at: '2026-06-30T00:02:49.280234+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The image-gallery module declares an `imageSize` dial with values `sm`, `md`, `lg`, defaulting to `md` when omitted. The selected value is emitted as a `fc-image-gallery--image-<value>` modifier class on the section. In the `masonry` variant the dial caps image height (`sm`/`md`/`lg` → progressively larger `max-height` with `object-fit: contain`) so a single tall image cannot dominate the column flow; the `grid` variant (fixed 1:1 `object-fit: cover` tiles) is unaffected by the dial.

## Verification

Read the image-gallery meta and assert `dials.imageSize` equals `["sm","md","lg"]`. Render a masonry gallery for each value and assert the matching `fc-image-gallery--image-<value>` class is emitted; render one with the dial omitted and assert `fc-image-gallery--image-md`. Confirm the masonry max-height cap rules are keyed off the `image-<value>` class and that the grid variant retains its fixed 1:1 aspect ratio independent of the dial.
