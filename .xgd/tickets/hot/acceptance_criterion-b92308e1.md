---
uid: acceptance_criterion-b92308e1
id: AC-562
type: acceptance_criterion
title: Per-account hourly fetch limit returns rate_limited on overage
created_by: xgd
created_at: '2026-06-27T00:34:04.033305+00:00'
updated_at: '2026-06-27T00:34:04.033305+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

For a single account, the first 20 rate-limit checks in a rolling 1-hour window succeed (returning `{ok:true, remaining:{...}}` with decreasing remainder). The 21st check in the same window returns `{ok:false, reason:'rate_limited', retryAfterSeconds: <1..3600>, window:'hour'}`.

## Verification

Issue 21 rate-limit checks against a stub KV with the same account ID in quick succession (within the same hour window per the injected clock). Assert checks 1–20 each return `ok:true` and that check 21 returns `ok:false` with reason `rate_limited`, window `hour`, and `retryAfterSeconds` between 1 and 3600.
