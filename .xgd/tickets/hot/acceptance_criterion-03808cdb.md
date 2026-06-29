---
uid: acceptance_criterion-03808cdb
id: AC-643
type: acceptance_criterion
title: Read-back reports a not-found failure when no digest exists
created_by: xgd
created_at: '2026-06-28T20:30:13.142251+00:00'
updated_at: '2026-06-29T21:45:49.738548+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
A read-transcription-digest request for a site that has no stored blueprint returns a distinct, non-error *not-ready* status rather than a failure: a success result whose payload identifies `kind = "transcription_digest_not_ready"` and carries the expected digest key. No blueprint contents are returned. A missing digest is an expected polling state — the convert has not run yet, or is mid-flight after Stage-0 evicted the prior digest — so the AI can poll for completion without the read surfacing as a hard tool error. (This supersedes the earlier contract in which a missing digest returned a failure whose error contained `digest_not_found`.)

## Verification
Invoke the read action with a site identifier for which no blueprint was written; assert the result status is success, its payload `kind` is `transcription_digest_not_ready`, and no digest contents are present.
