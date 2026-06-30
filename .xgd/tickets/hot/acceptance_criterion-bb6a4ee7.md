---
uid: acceptance_criterion-bb6a4ee7
id: AC-777
type: acceptance_criterion
title: Services-grid imageStyle dial (icon/cover/thumb) tags rendered cards with the
  matching image-style class, defaulting to icon
created_by: xgd
created_at: '2026-06-30T00:52:06.182988+00:00'
updated_at: '2026-06-30T00:52:06.182988+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The section-level `imageStyle` dial accepts `icon`, `cover`, or `thumb` and tags the rendered services-grid section with the corresponding image-style modifier class, which controls how each item image is sized within its card: `icon` (the default when the dial is omitted) sizes the image as a small square pictogram, `thumb` as a fixed ~6rem square, and `cover` as a full-bleed 16:9 banner at the top of the card.

## Verification

Render a services-grid carrying item images with `imageStyle` set to `icon`, `cover`, and `thumb` in turn; assert the section carries the matching `fc-services-grid--image-<style>` modifier class each time. Render without an `imageStyle` dial; assert the section falls back to the `icon` image-style class.
