---
uid: acceptance_criterion-fefece45
id: AC-690
type: acceptance_criterion
title: A text-asset-ref markdown field with no/failed resolution falls back to alt
  text
created_by: xgd
created_at: '2026-06-28T22:54:43.121575+00:00'
updated_at: '2026-06-28T22:54:43.121575+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
When a markdown content field holds a text-kind asset reference but no resolver is provided, or resolution fails, the renderer emits the reference's fallback alt text, or an empty body if no alt text is present. The render does not throw.

## Verification
Render a module whose markdown field is a text asset reference (a) with no resolver and a known alt value — assert the alt text is emitted; and (b) with no resolver and no alt — assert an empty body is emitted and rendering completes without error.