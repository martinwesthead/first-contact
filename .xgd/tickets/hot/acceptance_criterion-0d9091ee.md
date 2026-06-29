---
uid: acceptance_criterion-0d9091ee
id: AC-745
type: acceptance_criterion
title: configuration dials apply matching style hooks with documented defaults
created_by: xgd
created_at: '2026-06-29T23:13:14.492209+00:00'
updated_at: '2026-06-29T23:13:14.492209+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
The rendered section reflects each configuration dial as a corresponding style hook in its output:
- `imageRatio` is one of square / portrait / landscape and applies the matching ratio hook; when unspecified it defaults to `landscape`.
- `size` (sm/md/lg) defaults to `md`, `surface` (default/subtle/inverse/accent) defaults to `default`, and `spacingTop` / `spacingBottom` (from the set 0,1,2,3,4,6,8,12,16,24) each default to `12` when unspecified.
Each chosen dial value yields its corresponding marker in the rendered section.

## Verification
Render split-section for each imageRatio value and assert the matching ratio hook appears; render without imageRatio and assert the landscape default. Render without size/surface/spacing dials and assert the rendered section carries the documented default hooks (size=md, surface=default, spacingTop=spacingBottom=12).
