---
uid: acceptance_criterion-584cac9c
id: AC-669
type: acceptance_criterion
title: Failed asset mirrors appear in a 'What couldn't mirror' list with URL and reason,
  and the count reflects failures
created_by: xgd
created_at: '2026-06-28T20:55:56.629985+00:00'
updated_at: '2026-06-28T20:55:56.629985+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When an asset fails to mirror, a "What couldn't mirror" sub-section becomes visible and gains one row naming the failed asset's URL and its failure reason (e.g. body_too_large). The Assets-mirrored count line reflects both successes and failures (e.g. "1/2 (1 failed)").

## Verification
Render the progress card, deliver an Assets-mirrored "started" event with total 2, one successful asset-mirrored event, and one asset-failed event (url + reason). Assert the "What couldn't mirror" section is visible, contains a row naming that URL and reason, and the Assets-mirrored count reads "1/2 (1 failed)".
