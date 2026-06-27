---
uid: acceptance_criterion-0de0d343
id: AC-563
type: acceptance_criterion
title: Per-account burst limit returns rate_limited at 11 in 60s
created_by: xgd
created_at: '2026-06-27T00:34:16.256125+00:00'
updated_at: '2026-06-27T00:34:16.256125+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

For a single account, 11 rate-limit checks within any 60-second sliding window return rate-limited on the 11th regardless of remaining hourly budget. The 11th check returns `{ok:false, reason:'rate_limited', retryAfterSeconds: <1..60>, window:'burst'}`.

## Verification

Issue 11 rate-limit checks against a stub KV with the same account ID under an injected clock advancing less than 60 seconds total. Assert checks 1–10 each return `ok:true` and that check 11 returns `ok:false` with window `burst` and `retryAfterSeconds` between 1 and 60. Hourly budget remains available (less than 20 checks total).
