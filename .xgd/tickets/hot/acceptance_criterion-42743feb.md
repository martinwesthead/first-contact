---
uid: acceptance_criterion-42743feb
id: AC-578
type: acceptance_criterion
title: Deleted asset is no longer retrievable
created_by: xgd
created_at: '2026-06-27T00:46:19.042864+00:00'
updated_at: '2026-06-27T00:46:19.042864+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
After an asset is deleted, retrieving its key returns a not-found response.

## Verification
Upload an asset; issue `DELETE /api/assets/delete/<key>`; then request `/assets/<key>` and observe a 404 not-found response.
