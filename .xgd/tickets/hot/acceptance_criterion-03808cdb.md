---
uid: acceptance_criterion-03808cdb
id: AC-643
type: acceptance_criterion
title: Read-back reports a not-found failure when no digest exists
created_by: xgd
created_at: '2026-06-28T20:30:13.142251+00:00'
updated_at: '2026-06-28T20:30:13.142251+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
A read-transcription-digest request for a site that has no stored blueprint returns a failure result whose error identifies the cause as a missing digest (the error text contains `digest_not_found`). No blueprint contents are returned. This lets the AI detect that the convert step has not run successfully and re-prompt the operator.

## Verification
Invoke the read action with a site identifier for which no blueprint was written; assert the result status is failure and the error message contains `digest_not_found`.
