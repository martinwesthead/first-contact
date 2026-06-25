---
uid: comment-bfd336a0
id: COMMENT-172
type: comment
title: Comment on bug BUG-17
created_by: xgd
created_at: '2026-06-25T17:38:29.589653+00:00'
updated_at: '2026-06-25T18:03:10.383261+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-1fb01dc9
  kind: chat_transcript
---

<!-- xgd-turn id="b6613bb4-9e80-48cd-84f7-cc2ef722ff2e-user" -->

<!-- xgd-chat role="user" ts="2026-06-25T17:37:09.281Z" -->
#### You
I keep seeing messages about "Browser Rendering budget exhausted (session) for this session."

This is very fruestrating. I did not ask for a budget to be imposed on browser rendering and it is making testing impossible. Can you give me infinite budget please and remove this progress blocker?

<!-- xgd-turn id="b6613bb4-9e80-48cd-84f7-cc2ef722ff2e-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-25T17:38:56.114Z" -->
#### Claude
I found the source. The budget lives in `packages/web-fetch-safety/src/browser-budget.ts` with hard-coded defaults of **50 seconds per session, 200 per day**. It's enforced from `analyze-page.ts`, `transcribe-site.ts`, and `preview-generated-page.ts` whenever the `BROWSER_BUDGET_KV` binding is present in `apps/control-app/wrangler.toml`.

I need to know which direction you want before I touch anything. Three options:

The user dismissed the question — let me proceed with my recommendation.

Given that you said "infinite budget" and "remove this progress blocker", and XGD's no-legacy-modes rule says to delete rather than hide-behind-a-flag, I'd recommend **Option A: remove the budget entirely**. That means deleting the `BROWSER_BUDGET_KV` KV binding and stripping the budget calls from the three operator handlers. Per the free-coding protocol I need scope confirmed in the ticket before I touch code.

Here's the ticket draft I propose for BUG-17:

**Title**: `Browser Rendering: remove session/day budget cap blocking testing`

**Body**:
```
## Symptom

`analyze_page`, `transcribe_site`, and `preview_generated_page` repeatedly
fail in testing with:

  "Visual signals unavailable — Browser Rendering budget exhausted
   (session) for this session."

The cap (50 browser-seconds per session, 200 per day) trips during normal
testing flows and blocks the rendered-fetch path, leaving only static
signals with no screenshots.

## Root cause

`packages/web-fetch-safety/src/browser-budget.ts` enforces a hard-coded
DEFAULT_BROWSER_BUDGET = { sessionMaxSeconds: 50, dayMaxSeconds: 200 }.
It is invoked by all three operator handlers whenever `BROWSER_BUDGET_KV`
is bound. The cap was introduced by REQ-20 as a per-session safety net;
in practice it is hit constantly during test/dev cycles where one
session_id accumulates seconds across many calls.

## Fix

Remove the budget mechanism entirely (per XGD no-legacy-modes rule):

1. Remove `checkBrowserBudget` / `chargeBrowserBudget` calls from
   `apps/control-app/src/operator/{analyze-page,transcribe-site,preview-generated-page}.ts`.
2. Remove the `BROWSER_BUDGET_KV` binding from `apps/control-app/wrangler.toml`
   (both default and [env.production] sections).
3. Delete `packages/web-fetch-safety/src/browser-budget.ts` and its export
   from `packages/web-fetch-safety/src/index.ts`.
4. Delete the now-dead UATs:
     tests/test_UAT_FC_REQ-20_browser_budget.test.ts
     tests/test_UAT_FC_REQ-22_budget_exhausted_fallback.test.ts
   (Reconciliation will sync the matrix entries for REQ-20/REQ-22 against
   the deletion.)

Rate limiting via FETCH_RATE_KV (separate mechanism) remains in place as
the runaway-cost safety net.

## Test plan

UAT: test_UAT_FC_BUG-17_no_browser_budget_block
  - Confirm `analyze_page` against a real-ish URL completes without
    raising "Browser Rendering budget exhausted" regardless of how many
    times the same session invokes it (drive the handler N=5 times in one
    test against the same session, expect every call to take the rendered
    path or fail for a non-budget reason).
  - Confirm the three handlers no longer reference `BROWSER_BUDGET_KV`
    (import-graph assertion or grep-style check inside the test).
```

Two things to confirm before I start:

1. **Do you want the UATs for REQ-20 / REQ-22 deleted, or just the budget-specific assertions stripped?** The REQ-22 file likely tests the rendered-fetch fallback for *multiple* reasons (budget exhausted, BROWSER missing, driver throws); deleting the whole file removes coverage for the non-budget fallbacks too.
2. **Is this scoped to the operator handlers only, or should I also check whether other code paths in the repo charge against `BROWSER_BUDGET_KV`?** (My grep found only those three handlers, so I think yes — operator-only.)

Reply OK (or amend) and I'll write the ticket body and start coding.

<!-- xgd-turn id="777ea34e-0e01-469b-93ce-0ea26e05ad45-user" -->

<!-- xgd-chat role="user" ts="2026-06-25T18:03:01.370Z" -->
#### You
Wait is the budget a configurable number? Can't we just set it to a very high number?

<!-- xgd-chat-end -->