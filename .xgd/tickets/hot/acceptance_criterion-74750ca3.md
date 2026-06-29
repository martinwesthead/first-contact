---
uid: acceptance_criterion-74750ca3
id: AC-744
type: acceptance_criterion
title: image-right variant flips the desktop layout while preserving image-first DOM
  order
created_by: xgd
created_at: '2026-06-29T23:13:11.394481+00:00'
updated_at: '2026-06-29T23:13:11.394481+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
Rendering the module with the `image-right` variant produces a section marked as the `image-right` variant. The media still appears before the content in document order (so that on narrow/mobile widths the section stacks image-first); the right-side placement of the image is a desktop-only visual reordering, not a change to source order.

## Verification
Render split-section with variant `image-right`. Assert the output carries the image-right variant marker and that the media element still precedes the content element in DOM order.
