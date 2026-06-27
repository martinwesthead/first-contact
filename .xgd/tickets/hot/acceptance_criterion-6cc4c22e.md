---
uid: acceptance_criterion-6cc4c22e
id: AC-565
type: acceptance_criterion
title: Browser-rendering budget exhausts per chat session at 50 seconds
created_by: xgd
created_at: '2026-06-27T00:34:24.128887+00:00'
updated_at: '2026-06-27T00:34:24.128887+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

For a single chat session, once 50 browser-seconds have been charged to the session counter, any subsequent budget check returns `{ok:false, reason:'budget_exhausted', exhausted:'session', remainingSeconds:0}`. The session budget is independent of the per-account-day budget.

A budget check before exhaustion returns `{ok:true, remaining:{session,day}}` with the remaining seconds. The charge that exceeds the cap returns budget-exhausted at the next check (the boundary is inclusive: spent >= 50s triggers exhaustion).

## Verification

Charge cumulative browser-seconds to a single session under an injected clock and a stub KV until the session counter reaches 50. Assert the next check returns `ok:false`, reason `budget_exhausted`, exhausted `session`, and `remainingSeconds: 0`. A check against a different session ID (same account) still returns `ok:true`.
