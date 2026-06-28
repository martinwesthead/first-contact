---
uid: acceptance_criterion-4000b4c1
id: AC-645
type: acceptance_criterion
title: Single asset is mirrored to a content-addressed storage key with a success
  result
created_by: xgd
created_at: '2026-06-28T20:40:15.933698+00:00'
updated_at: '2026-06-28T20:40:15.933698+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-5d1952ba
  kind: behavior
  regression_only: false
---

## Criterion
Mirroring a single fetchable asset URL for a site writes the downloaded bytes to the platform asset bucket at the content-addressed key `sites/{siteId}/imports/{16-hex-chars}.{ext}` and returns a success outcome containing: the storage key, the canonical content type, and the byte length of the stored object. The stored object's bytes are byte-for-byte identical to the fetched body.

## Verification
Mirror a known image URL (with content available through an injected safe-fetch stub) for a given site id; assert the returned outcome reports success with a key matching `^sites/{siteId}/imports/[0-9a-f]{16}\.{ext}$`, the expected canonical content type, and the correct byte count; then read the object back from the bucket and assert its bytes equal the source bytes.
