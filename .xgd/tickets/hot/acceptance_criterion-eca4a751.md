---
uid: acceptance_criterion-eca4a751
id: AC-641
type: acceptance_criterion
title: Un-mirrored assets are excluded from the inventory and recorded in the mirror
  summary
created_by: xgd
created_at: '2026-06-28T20:30:07.431703+00:00'
updated_at: '2026-06-28T20:30:07.431703+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
An asset that could not be mirrored does not appear in the blueprint's asset inventory (the inventory the AI is given lists only successfully hosted assets). Instead, the blueprint's mirror summary records the count of mirrored and failed assets and a per-failure list naming the source URL and the failure reason. A source with one good and one failing asset yields an inventory of one entry, a mirrored count of 1, a failed count of 1, and one failure record for the failing URL.

## Verification
Produce a blueprint for a source with one downloadable asset and one that fails to mirror; assert the inventory contains only the good asset, the mirror summary reports mirrored=1 / failed=1, and the failures list contains exactly the failing URL with a reason.
