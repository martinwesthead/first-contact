---
uid: acceptance_criterion-faa54e19
id: AC-839
type: acceptance_criterion
title: Default browser budget accepts arbitrarily large charges
created_by: xgd
created_at: '2026-06-30T06:34:18.081291+00:00'
updated_at: '2026-06-30T06:34:18.081291+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

With no `config` override supplied, the browser-rendering budget contract accepts an arbitrarily large browser-second charge. Charging a large cost (e.g. 100,000 seconds) against a fresh session — and repeating many such charges within the same session and account-day — returns `{ok:true, ...}` every time; the cap never fires under default configuration. The contract's default ceilings, `DEFAULT_BROWSER_BUDGET.sessionMaxSeconds` and `DEFAULT_BROWSER_BUDGET.dayMaxSeconds`, are each `>= 1e9`.

## Verification

Against a stub KV with no `config` override: charge `costSeconds = 100000` to a fresh session and assert the result is `{ok:true}`; repeat the large charge many times (e.g. 100 × 1000s) and assert `checkBrowserBudget` still reports `ok:true`. Separately assert both `DEFAULT_BROWSER_BUDGET` constants are `>= 1e9`.
