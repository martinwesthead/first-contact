---
uid: acceptance_criterion-43292584
id: AC-729
type: acceptance_criterion
title: Digest write is verified by read-back (capturedAt round-trip) or fails digest_write_unverified
created_by: xgd
created_at: '2026-06-29T21:46:07.983224+00:00'
updated_at: '2026-06-29T21:46:07.983224+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
After writing the transcription digest, transcribe_site reads it back and verifies that the round-tripped `capturedAt` sentinel matches the value just written. If the digest cannot be retrieved after the write, the round-tripped JSON does not parse, or the `capturedAt` differs from what was written, the convert returns a failure whose error identifies the cause as `digest_write_unverified` (rather than silently reporting success). Only a confirmed, matching read-back lets the convert report success. This guards against eventual-consistency drift, a racing writer to the same key, or a put that was silently dropped.

## Verification
Drive a convert whose post-write read-back returns a digest with a mismatched (or unparseable / absent) `capturedAt`; assert the convert result status is failure and the error contains `digest_write_unverified`. Conversely, when the read-back returns a matching `capturedAt`, assert the convert reports success.
