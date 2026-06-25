---
uid: acceptance_criterion-56852de9
id: AC-418
type: acceptance_criterion
title: Hero bg-color variant renders without a background image element
created_by: xgd
created_at: '2026-06-25T00:57:04.149892+00:00'
updated_at: '2026-06-25T00:57:04.149892+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the hero module with variant `bg-color` produces markup that contains the eyebrow (when supplied), the heading, the subhead (when supplied), and the CTA (when supplied), but does NOT contain any background image element — even if a content `image` field is incidentally present.

## Verification

Render the hero module with variant `bg-color` and heading content. Assert the rendered HTML contains the heading text. Assert the rendered HTML contains no `<img>` element marked as the hero background (no element bearing the hero background-image marker class or data attribute).
