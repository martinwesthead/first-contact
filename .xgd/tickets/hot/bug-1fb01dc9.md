---
uid: bug-1fb01dc9
id: BUG-17
type: bug
title: 'Browser Rendering: raise default budget to effectively infinite'
created_by: xgd
created_at: '2026-06-25T17:35:58.068404+00:00'
updated_at: '2026-06-25T19:42:04.327282+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - ed5168a3a5e3d52215d82c89e033a5b3e119e21f
  - 313216d72f2cd3043d38b065b8acea35b5965663
  version: 0.0.39
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


## Outcome (as shipped)

Commits:
- ed5168a3 — defaults bump + 3 test updates + new BUG-17 UAT
- 313216d7 — version bump 0.0.38 → 0.0.39

Files changed:
- packages/web-fetch-safety/src/browser-budget.ts (defaults raised to 1_000_000_000)
- tests/test_UAT_FC_REQ-20_browser_budget.test.ts (charge calls now pass an explicit config: { sessionMaxSeconds: 50, dayMaxSeconds: 200 } so the cap mechanism is still exercised under tight values; default-constant assertion updated to >= 1e9)
- tests/test_UAT_FC_REQ-22_budget_exhausted_fallback.test.ts (operator handler doesn't accept a config override, so instead of burning 10×5s the test now seeds the session KV counter directly with spentSeconds = DEFAULT_BROWSER_BUDGET.sessionMaxSeconds to trip the exhausted-fallback path)
- tests/test_UAT_FC_REQ-51_preview_generated_page.test.ts (same KV-seed treatment for AC5's budget-exhausted parity test)
- tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts (new — 3 ITs covering: defaults are >= 1e9; a 100_000s charge against a fresh session is accepted; 100 × 1_000s charges still leave checkBrowserBudget reporting ok)
- package.json (0.0.38 → 0.0.39)

Verification:
- pnpm vitest run on the 4 affected test files: 15/15 pass.
- xgd quality run --lint-only / --build-only: both SUCCESS.
- xgd quality run with --test-filter-expression reports SUCCESS but vacuous (the project's quality.yaml has test_dirs set to a plugin id rather than a directory pattern, so vitest reports "no test files found"; preexisting condition, not introduced by this fix).