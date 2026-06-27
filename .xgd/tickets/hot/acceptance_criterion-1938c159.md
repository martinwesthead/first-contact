---
uid: acceptance_criterion-1938c159
id: AC-564
type: acceptance_criterion
title: Per-account daily fetch limit returns rate_limited on overage
created_by: xgd
created_at: '2026-06-27T00:34:19.273315+00:00'
updated_at: '2026-06-27T00:34:19.273315+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

For a single account, the first 100 rate-limit checks in a rolling 24-hour window succeed. The 101st check in the same window returns `{ok:false, reason:'rate_limited', retryAfterSeconds: <1..86400>, window:'day'}`. The daily limit is enforced independently of the hourly and burst windows.

## Verification

Issue 101 rate-limit checks spread across the rolling-day window (advancing the injected clock so the hourly and burst windows reset between batches but the daily window does not). Assert checks 1–100 return `ok:true` and check 101 returns `ok:false` with window `day` and `retryAfterSeconds` between 1 and 86400.
