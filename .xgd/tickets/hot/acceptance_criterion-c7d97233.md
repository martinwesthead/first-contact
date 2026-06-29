---
uid: acceptance_criterion-c7d97233
id: AC-738
type: acceptance_criterion
title: Image-gallery optional heading and per-item caption render only when provided
created_by: xgd
created_at: '2026-06-29T22:34:24.553271+00:00'
updated_at: '2026-06-29T22:34:24.553271+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

An image-gallery renders its `heading` element only when a `heading` is supplied in content, and omits it entirely when absent. Likewise, each item renders a caption (muted text below the image) only when that item supplies a `caption`, and omits the caption element for items without one.

## Verification

Render an image-gallery with a `heading` and assert the heading element is present; render one without a `heading` and assert no heading element is emitted. Render items where some have a `caption` and some do not; assert a caption element appears for items with a caption and is absent for items without one.
