---
uid: acceptance_criterion-bf5873e5
id: AC-772
type: acceptance_criterion
title: Markdown bodies constrain inline images so they cannot overflow the layout
created_by: xgd
created_at: '2026-06-30T00:02:43.903451+00:00'
updated_at: '2026-06-30T00:02:43.903451+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Every catalog module that renders a markdown body constrains inline `<img>` elements within that body so an oversized image cannot break the layout: each such image is rendered at `max-width: 100%; height: auto; display: block`. This applies to all markdown-rendering bodies across the catalog — hero subhead, text-block body, services-grid subhead and per-item bodies, split-section body, testimonials quote, and banner subhead.

This is the catalog-wide cross-cutting image-safety constraint; it is owned by this story (the single behaviour spans modules owned by multiple stories), while the individual modules' existence is documented by their own stories.

## Verification

For each markdown-rendering module, render the module with a markdown body containing an inline image and assert the image is emitted inside the module's body container. Inspect the module's scoped styling and assert the body container scopes inline `<img>` to `max-width: 100%` (with `height: auto` and `display: block`). Cover hero, text-block, services-grid, split-section, testimonials, and banner.
