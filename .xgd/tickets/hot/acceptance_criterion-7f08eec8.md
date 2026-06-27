---
uid: acceptance_criterion-7f08eec8
id: AC-566
type: acceptance_criterion
title: Browser-rendering budget exhausts per account-day at 200 seconds
created_by: xgd
created_at: '2026-06-27T00:34:34.476085+00:00'
updated_at: '2026-06-27T00:34:34.476085+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

For a single account, once 200 browser-seconds have been charged across all sessions within the current UTC day, any subsequent budget check returns `{ok:false, reason:'budget_exhausted', exhausted:'day', remainingSeconds:0}`. The day counter resets at the next UTC day boundary.

## Verification

Charge cumulative browser-seconds against a stub KV under an injected clock so the account-day counter reaches 200 across multiple session IDs. Assert the next check returns `ok:false`, reason `budget_exhausted`, exhausted `day`, and `remainingSeconds: 0`. Advance the clock past the next UTC day boundary; the next check returns `ok:true` with full day budget.
