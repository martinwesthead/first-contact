---
uid: acceptance_criterion-d7269020
id: AC-757
type: acceptance_criterion
title: simple banner renders the heading and emits no CTA when no cta is provided
created_by: xgd
created_at: '2026-06-29T23:37:37.986012+00:00'
updated_at: '2026-06-29T23:37:37.986012+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
Rendering a banner with the `simple` variant and a heading produces a published banner section that is identified as the simple variant and contains the heading text. When no `cta` value is supplied, the rendered output contains no CTA button/link.

## Verification
Render the banner with variant `simple` and a heading only; assert the output is tagged as a banner / simple-variant section, contains the heading text, and contains no CTA element.
