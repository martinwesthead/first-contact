---
uid: acceptance_criterion-46092a83
id: AC-753
type: acceptance_criterion
title: avatar renders as a circular image with the asset source and alt when supplied,
  and is omitted when absent
created_by: xgd
created_at: '2026-06-29T23:21:19.356854+00:00'
updated_at: '2026-06-29T23:21:19.356854+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
When a testimonial item supplies an `avatar` asset reference, the rendered card includes an avatar image whose source matches the asset reference's source and whose alt text matches the asset reference's alt text, presented as a small (~64px) circular image. When a testimonial item supplies no avatar, no avatar image is rendered for that item.

## Verification
Render an item with an avatar asset reference and assert the output contains an avatar image carrying that reference's source and alt text. Render an item without an avatar and assert no avatar image is present.
