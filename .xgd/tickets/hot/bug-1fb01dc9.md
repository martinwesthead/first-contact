---
uid: bug-1fb01dc9
id: BUG-17
type: bug
title: 'Browser Rendering: raise default budget to effectively infinite'
created_by: xgd
created_at: '2026-06-25T17:35:58.068404+00:00'
updated_at: '2026-06-25T18:04:05.093564+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Symptom

`analyze_page`, `transcribe_site`, and `preview_generated_page` repeatedly
fail in testing with:

  "Visual signals unavailable — Browser Rendering budget exhausted
   (session) for this session."

The cap (50 browser-seconds per session, 200 per day) trips during
normal test/dev flows where one session_id accumulates seconds across
many calls, leaving only static signals with no screenshots.

## Root cause

`packages/web-fetch-safety/src/browser-budget.ts` exports a hard-coded
DEFAULT_BROWSER_BUDGET = { sessionMaxSeconds: 50, dayMaxSeconds: 200 }.
The three operator handlers (analyze-page, transcribe-site,
preview-generated-page) call checkBrowserBudget / chargeBrowserBudget
without passing any `config` override, so they always use those defaults.

## Fix

Raise the two default constants to 1_000_000_000 each so the cap is
effectively infinite for production callers. The budget infrastructure
(KV counters, config override plumbing, BROWSER_BUDGET_KV binding) stays
intact — a future re-tightening is a one-constant edit or a per-call
`config: { sessionMaxSeconds: N, dayMaxSeconds: M }` override.

Rate limiting via FETCH_RATE_KV (separate mechanism) remains the
runaway-cost safety net.

## Test plan

- New UAT: tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts
  - Charge a large costSeconds (e.g. 100_000) against a fresh session with
    no config override; assert the result is { ok: true } and the cap
    constants are ≥ 1e9.
- Update tests/test_UAT_FC_REQ-20_browser_budget.test.ts to pass an
  explicit small `config` to checkBrowserBudget / chargeBrowserBudget so
  the cap mechanism is still exercised — without coupling the test to
  the (now-huge) default values.

## Files

- packages/web-fetch-safety/src/browser-budget.ts (constant bump)
- tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts (new)
- tests/test_UAT_FC_REQ-20_browser_budget.test.ts (update to pass explicit config)