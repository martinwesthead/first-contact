---
uid: acceptance_criterion-5129081d
id: AC-743
type: acceptance_criterion
title: image-left variant renders image before text with all required content
created_by: xgd
created_at: '2026-06-29T23:13:08.245193+00:00'
updated_at: '2026-06-29T23:13:08.245193+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
Rendering the module with the `image-left` variant produces a section marked as the `image-left` variant in which the media (image) appears before the content block in document order. The supplied image (with its source and alt text), the heading, and the markdown body all appear in the rendered output.

## Verification
Render split-section with variant `image-left` and a minimal content set (image, heading, body). Assert the output carries the image-left variant marker, that the media element precedes the content element in DOM order, and that the image source, heading text, and body text are all present.
