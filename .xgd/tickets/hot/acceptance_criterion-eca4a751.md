---
uid: acceptance_criterion-eca4a751
id: AC-641
type: acceptance_criterion
title: Un-mirrored assets are excluded from the inventory and recorded in the mirror
  summary
created_by: xgd
created_at: '2026-06-28T20:30:07.431703+00:00'
updated_at: '2026-06-29T21:45:45.473903+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
An asset that could not be mirrored does not appear in the blueprint's asset inventory (the inventory the AI is given lists only successfully hosted assets). Instead, the failure is recorded per-URL in two places: (1) the blueprint's mirror summary records the count of mirrored and failed assets and a per-failure list naming the source URL and the failure reason; and (2) the convert action's tool-return payload surfaces the same per-URL failures as `summary.assetFailures` (each entry an object with the source `url` and a `reason`), alongside the aggregate `mirrored` and `mirrorFailures` counts, so the operator/AI sees exactly what didn't fetch without parsing the digest. A source with one good and one failing asset yields an inventory of one entry, a mirrored count of 1, a failed count of 1, and one failure record (URL + reason) for the failing asset in both the mirror summary and `summary.assetFailures`.

## Verification
Produce a blueprint for a source with one downloadable asset and one that fails to mirror; assert the inventory contains only the good asset, the mirror summary reports mirrored=1 / failed=1 with the failing URL and a reason, and the convert action's returned `summary.assetFailures` contains exactly the failing URL with a reason.
