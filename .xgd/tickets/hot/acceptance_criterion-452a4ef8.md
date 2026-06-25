---
uid: acceptance_criterion-452a4ef8
id: AC-420
type: acceptance_criterion
title: Hero omits the CTA when no CTA content is provided
created_by: xgd
created_at: '2026-06-25T00:57:15.942916+00:00'
updated_at: '2026-06-25T00:57:15.942916+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the hero module without a CTA in content produces markup that contains no CTA anchor element.

## Verification

Render the hero module with a heading but with the CTA content field omitted. Assert the rendered HTML contains no anchor element marked as the hero CTA (no element bearing the hero-cta marker class).
