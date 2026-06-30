---
uid: acceptance_criterion-b5a2b756
id: AC-833
type: acceptance_criterion
title: Local /assets images are inlined so hero, services-grid, and logo imagery render
  in the preview
created_by: xgd
created_at: '2026-06-30T06:25:05.129357+00:00'
updated_at: '2026-06-30T06:25:05.129357+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
Local site assets referenced as `/assets/<key>` in the draft — hero background images, services-grid item images, and header/footer logos, in both image `src` attributes and CSS `url(...)` references — are inlined from asset storage as data URLs before capture, so they appear in the rendered preview instead of failing to resolve. Each referenced asset that exists in storage is inlined.

## Verification
Render a draft whose hero `bg-image`, services-grid items, and header logo reference valid `/assets/<key>` objects in storage; assert the content handed to the rendering engine contains inlined `data:` image data for those references (matching the stored bytes) and no longer contains unresolved `/assets/<key>` references for assets that exist.
