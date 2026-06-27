---
uid: acceptance_criterion-4432e26a
id: AC-579
type: acceptance_criterion
title: Full CRUD flow operates against locally-emulated asset storage
created_by: xgd
created_at: '2026-06-27T00:46:22.706256+00:00'
updated_at: '2026-06-27T00:46:22.706256+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
The complete asset upload, list, retrieval, etag-guarded overwrite, and delete flow operates correctly against a locally-emulated asset bucket, without requiring a provisioned cloud bucket.

## Verification
Run the control-app worker against a local development surface that emulates the asset bucket in process (for example, `wrangler dev` or an equivalent Miniflare-backed test harness) with no real cloud bucket bound; exercise an upload, a list, a retrieval, an `If-Match` overwrite, and a delete in sequence; observe that each step behaves as the other acceptance criteria for this story require.
