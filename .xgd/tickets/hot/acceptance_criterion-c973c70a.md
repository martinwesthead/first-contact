---
uid: acceptance_criterion-c973c70a
id: AC-575
type: acceptance_criterion
title: Listing endpoint enumerates stored assets with full metadata
created_by: xgd
created_at: '2026-06-27T00:46:09.488418+00:00'
updated_at: '2026-06-27T00:46:09.488418+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
The listing endpoint returns an entry for every currently-stored asset, and each entry carries the asset's key, byte size, etag, upload timestamp, and content type.

## Verification
Upload one or more assets through the put endpoint; then request `/api/assets/list` and observe a 200 JSON response containing an items collection in which each previously-uploaded asset appears with a non-empty key, an integer size matching the uploaded byte length, a non-empty etag, an ISO-8601 timestamp for upload, and the content type that was supplied at upload.
