---
uid: comment-bfd336a0
id: COMMENT-172
type: comment
title: Comment on bug BUG-17
created_by: xgd
created_at: '2026-06-25T17:38:29.589653+00:00'
updated_at: '2026-06-25T18:09:40.682821+00:00'
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

<!-- xgd-turn id="777ea34e-0e01-469b-93ce-0ea26e05ad45-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-25T18:03:21.547Z" -->
#### Claude
Yes — the budget is fully configurable. `BrowserBudgetConfig` is a typed `{ sessionMaxSeconds, dayMaxSeconds }` object, and `checkBrowserBudget`/`chargeBrowserBudget` accept a per-call `config?: Partial<BrowserBudgetConfig>` override. The current values are just the defaults in `DEFAULT_BROWSER_BUDGET`:

```ts
export const DEFAULT_BROWSER_BUDGET: BrowserBudgetConfig = {
  sessionMaxSeconds: 50,
  dayMaxSeconds: 200,
};
```

(`packages/web-fetch-safety/src/browser-budget.ts:8-11`)

The three operator handlers (`analyze-page.ts`, `transcribe-site.ts`, `preview-generated-page.ts`) call those functions without passing any `config`, so they always use the defaults. Bumping the two default constants to a huge number is a one-file, two-line change and your "infinite budget" is done — no removed bindings, no deleted tests, no plumbing torn out.

Revised proposal:

**Ticket BUG-17 scope** — Raise `DEFAULT_BROWSER_BUDGET` to effectively infinite (e.g., `sessionMaxSeconds: 1_000_000_000`, `dayMaxSeconds: 1_000_000_000`). Existing budget infrastructure stays intact so it can be re-tightened later by editing one constant (or by passing a `config` override per call site).

**UAT**: `test_UAT_FC_BUG-17_browser_budget_effectively_infinite`
- Drive `checkBrowserBudget` with a large `costSeconds` charge (e.g., 100,000) against a fresh session, assert it returns `{ ok: true }`.
- Confirm `DEFAULT_BROWSER_BUDGET.sessionMaxSeconds` and `dayMaxSeconds` are ≥ 1e9.

The existing REQ-20 UAT (`tests/test_UAT_FC_REQ-20_browser_budget.test.ts`) will need updating since it asserts on the 50s cap — I'll need to either pass an explicit small `config` to those tests so they still exercise the cap logic with a tight value, or rewrite them to use the production-default. I'd recommend the former — keeps coverage of the cap mechanism honest without coupling it to the (now-huge) default.

Want me to proceed with this approach? OK and I'll fill in the BUG-17 body and start.

<!-- xgd-turn id="9143e4d8-36f5-4c38-8b1f-91652fdc8304-user" -->

<!-- xgd-chat role="user" ts="2026-06-25T18:03:39.512Z" -->
#### You
yes please just make the config change

<!-- xgd-turn id="9143e4d8-36f5-4c38-8b1f-91652fdc8304-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-25T18:09:39.676Z" -->
#### Claude
Scoping the ticket first, then I'll read the existing REQ-20 test to understand what needs updating.

Three test files assert the 50s default — REQ-20, REQ-22, REQ-51. REQ-20 calls `chargeBrowserBudget` directly (easy: pass explicit config). REQ-22 and REQ-51 go through operator handlers that don't accept config, so I'll pre-populate the KV counter to ≥ 1e9 to trip the cap.

Now REQ-51 — let me check the makePreviewHarness signature and confirm BROWSER_BUDGET_KV is exposed similarly.

Good — same harness shape. Update REQ-51:

All 15 tests pass. Now let me run the broader xgd quality pass via test-filter-expression so the lint/build phases also run.

The xgd quality vitest filter is misconfigured at the project level (`test_dirs` contains a plugin id rather than a directory) — that's why it says "no test files found / vacuous pass". My affected tests do pass via `pnpm vitest run` though. Let me verify lint and build still pass explicitly.

Lint and build pass. Now committing — task #5 is in progress.

The free-coded commit is `ed5168a3`. Now setting ticket status=free_coded with commits=[sha].

Promoted to `free_coded`. Closing out the task and verifying ticket state.

The ticket body needs to mention the REQ-22 and REQ-51 test updates too. Updating to reflect what actually shipped.

Done. BUG-17 is `free_coded` with both commit SHAs recorded.

**Summary**

- **`packages/web-fetch-safety/src/browser-budget.ts`** — `DEFAULT_BROWSER_BUDGET` raised to `{ sessionMaxSeconds: 1_000_000_000, dayMaxSeconds: 1_000_000_000 }`. The "Browser Rendering budget exhausted" message you were hitting in tests/dev is now effectively impossible (would take ~31.7 years of continuous browser-seconds on one session). KV counters, BROWSER_BUDGET_KV binding, and per-call `config` override all remain — you can tighten any specific call site again by passing `config: { sessionMaxSeconds: N, dayMaxSeconds: M }`.
- **Tests**: REQ-20 now exercises the cap with an explicit tight 50s/200s `config`; REQ-22 and REQ-51 (which go through operator handlers that don't take a config) now seed the KV counter directly to test the exhausted-fallback path; new `tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts` covers the new behavior. All 15 tests in the 4 affected files pass.
- **Commits**: `ed5168a3` (feat + tests) and `313216d7` (version bump 0.0.38 → 0.0.39), both tagged `[FREE-CODED]`.

<!-- xgd-chat-end -->