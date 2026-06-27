---
uid: acceptance_criterion-5203e141
id: AC-577
type: acceptance_criterion
title: Overwrite with stale If-Match etag is rejected and leaves the object unchanged
created_by: xgd
created_at: '2026-06-27T00:46:16.367290+00:00'
updated_at: '2026-06-27T00:46:16.367290+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
An overwrite that supplies an `If-Match` etag that does not match the object's current etag is rejected as a precondition failure, and the stored object is not modified.

## Verification
Upload an asset; attempt to upload different bytes to the same key with an `If-Match` value that does not match the object's current etag; observe a 412 response, and observe that retrieving the key still returns the original bytes.
