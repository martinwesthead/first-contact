---
uid: acceptance_criterion-36f666b4
id: AC-784
type: acceptance_criterion
title: xgd_ticket action surfaces a sidecar failure as a failed result
created_by: xgd
created_at: '2026-06-30T01:10:50.787263+00:00'
updated_at: '2026-06-30T01:10:50.787263+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
With dev-tools enabled, when the sidecar responds with a non-success HTTP status, is unreachable, or returns a non-JSON or error body, the `xgd_ticket` action returns a failed result whose message surfaces the sidecar-reported error.

## Verification
Drive the action with an injected request function that returns a non-2xx response (and separately an unreachable/throwing function and a non-JSON body); assert the result status is "failed" and the error message reflects the sidecar response.
