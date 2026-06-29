---
uid: acceptance_criterion-eb39c93d
id: AC-740
type: acceptance_criterion
title: Image-gallery rejects items[] length outside 2..24
created_by: xgd
created_at: '2026-06-29T22:34:41.583828+00:00'
updated_at: '2026-06-29T22:34:41.583828+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The content validator rejects image-gallery content whose `items[]` array has fewer than 2 or more than 24 entries, surfacing a violation identifying the `items` field. Each item is an object requiring an `image` asset ref and allowing an optional `caption` string.

## Verification

Validate image-gallery content with 1 item and with 25 items; assert both are rejected with a violation that identifies the `items` field. Validate content with a count within 2..24 and assert it passes.
