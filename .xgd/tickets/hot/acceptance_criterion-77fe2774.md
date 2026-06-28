---
uid: acceptance_criterion-77fe2774
id: AC-668
type: acceptance_criterion
title: Asset-mirror stage shows a running N/M mirrored count as assets are imported
created_by: xgd
created_at: '2026-06-28T20:55:53.980819+00:00'
updated_at: '2026-06-28T20:55:53.980819+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When the Assets-mirrored stage starts it carries a total M; as each asset is successfully mirrored the "Assets mirrored" row shows a running count in the form "N/M" reflecting the number mirrored so far against the total.

## Verification
Render the progress card, deliver an Assets-mirrored "started" event with total 3, then two successful asset-mirrored events, and assert the Assets-mirrored row's count reads "2/3".
