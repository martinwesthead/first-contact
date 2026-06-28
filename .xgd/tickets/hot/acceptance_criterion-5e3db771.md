---
uid: acceptance_criterion-5e3db771
id: AC-644
type: acceptance_criterion
title: Read-back rejects a request lacking a site identifier
created_by: xgd
created_at: '2026-06-28T20:30:16.436794+00:00'
updated_at: '2026-06-28T20:30:16.436794+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
A read-transcription-digest request that omits a (non-empty string) site identifier returns a failure result rather than attempting a lookup. No blueprint contents are returned.

## Verification
Invoke the read action with no site identifier; assert the result status is failure.
