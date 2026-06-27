---
uid: acceptance_criterion-adb2d4e4
id: AC-574
type: acceptance_criterion
title: Uploaded asset is retrievable with the same bytes and content type
created_by: xgd
created_at: '2026-06-27T00:46:06.178630+00:00'
updated_at: '2026-06-27T00:46:06.178630+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-13685321
  kind: behavior
  regression_only: false
---

## Criterion
After an operator uploads bytes to a given asset key with a declared content type, retrieving that key returns exactly those bytes and the same content type.

## Verification
Upload a byte sequence to `/api/assets/put/<key>` with a chosen `Content-Type` header; then request `/assets/<key>` and observe a 200 response whose body equals the uploaded bytes byte-for-byte and whose `Content-Type` header matches the value supplied at upload.
