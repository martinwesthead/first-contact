---
uid: acceptance_criterion-7f08eec8
id: AC-566
type: acceptance_criterion
title: Browser-rendering account-day budget is infinite by default; finite cap only
  under config override
created_by: xgd
created_at: '2026-06-27T00:34:34.476085+00:00'
updated_at: '2026-06-30T06:33:47.909112+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

The DEFAULT per-account-day browser-rendering budget is effectively infinite: `DEFAULT_BROWSER_BUDGET.dayMaxSeconds` is `1e9` (one billion seconds), so a budget check or charge that supplies no `config` override never returns day exhaustion under any realistic accumulation of browser-seconds within a UTC day.

A finite per-account-day cap is enforced only when an explicit `config` override supplies a smaller `dayMaxSeconds`. When such an override is in effect, once the account-day counter reaches that cap across all sessions within the current UTC day, any subsequent budget check returns `{ok:false, reason:'budget_exhausted', exhausted:'day', remainingSeconds:0}`. The day counter resets at the next UTC day boundary regardless of the cap in force.

## Verification

Default path: charge a large cumulative browser-seconds total (e.g. well above the old 200s ceiling) across multiple session IDs for one account under an injected clock and a stub KV with NO `config` override; assert every check returns `ok:true`. Override path: pass `config: {dayMaxSeconds: 200}` and charge across multiple session IDs until the account-day counter reaches 200; assert the next check returns `ok:false`, reason `budget_exhausted`, exhausted `day`, `remainingSeconds: 0`. Advance the clock past the next UTC day boundary; the next check returns `ok:true` with full day budget.
