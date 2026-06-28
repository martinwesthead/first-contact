---
uid: acceptance_criterion-e55d2c91
id: AC-630
type: acceptance_criterion
title: Successful conversion persists a per-site transcription digest artifact matching
  the summary counts
created_by: xgd
created_at: '2026-06-28T20:10:56.482417+00:00'
updated_at: '2026-06-28T20:10:56.482417+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
A successful conversion persists a TranscriptionDigest artifact at a stable
per-site location (`sites/{siteId}/transcription/digest.json` in the assets
store). The persisted artifact contains the derived theme tokens, a per-page plan,
and an asset inventory; the page count and asset count reported in the completion
summary equal the number of per-page-plan entries and asset-inventory entries in
the persisted artifact.

## Verification
Convert an analyzed, consented URL. Read the artifact at the per-site digest
location and assert it parses as a TranscriptionDigest; assert the completion
summary's pageCount and assetCount equal the lengths of the artifact's per-page
plan and asset inventory respectively.
