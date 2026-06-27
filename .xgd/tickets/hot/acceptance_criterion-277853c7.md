---
uid: acceptance_criterion-277853c7
id: AC-560
type: acceptance_criterion
title: Response body is capped at 5 MB with no partial body returned
created_by: xgd
created_at: '2026-06-27T00:33:52.966499+00:00'
updated_at: '2026-06-27T00:33:52.966499+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

When a fetch's response body would exceed 5 MB (5 * 1024 * 1024 bytes), reading is aborted as soon as the cumulative size exceeds the cap, the underlying response stream is cancelled, and the caller receives `{ok:false, reason:'body_too_large'}` with no body field. A 5 MB body must NOT be returned even partially.

A response whose body is at or below 5 MB returns normally with the full body in the success result.

## Verification

With a controlled `fetchImpl` that streams a body larger than 5 MB, assert the result is `{ok:false, reason:'body_too_large'}` with no body field. With a 4 MB body, assert success and full byte-length match. The oversize-body response stream is cancelled rather than fully drained.
