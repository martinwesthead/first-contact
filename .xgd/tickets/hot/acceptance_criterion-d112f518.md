---
uid: acceptance_criterion-d112f518
id: AC-576
type: acceptance_criterion
title: Overwrite with matching If-Match etag succeeds and yields a new etag
created_by: xgd
created_at: '2026-06-27T00:46:13.072997+00:00'
updated_at: '2026-06-27T00:46:13.072997+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
An overwrite that supplies an `If-Match` etag equal to the object's current etag is applied; the resulting object holds the new bytes and is identified by a new etag distinct from the one supplied in `If-Match`.

## Verification
Upload an asset and capture its etag; upload different bytes to the same key with `If-Match: <captured-etag>`; observe a 2xx success response carrying a new etag value that differs from the captured etag, and observe that retrieving the key returns the new bytes.
