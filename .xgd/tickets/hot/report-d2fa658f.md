---
uid: report-d2fa658f
id: REPORT-647
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T02:50:36.435277+00:00'
updated_at: '2026-06-27T02:50:36.435277+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `tests/test_UAT_FC_REQ-20_browser_budget.test.ts` — class **DU** (main/ours: file absent; incoming `ed5168a3` modifies). Rule **2a (DU, incoming meaningful)** → `git checkout --theirs && git add`. The incoming change is a meaningful free-coded test update (BUG-17: adds an explicit `{ sessionMaxSeconds: 50, dayMaxSeconds: 200 }` config override so the cap-enforcement path stays exercised after the default budget was raised to effectively infinite). The "deletion" on the ours side is not a refactor — it is an artifact of this resync branch being rooted at a base (`5c45ff22`) that predates the REQ-20 web-fetch-safety scaffolding commit (`5611abd7`), so the file simply never existed in this branch's lineage.

## Incoming changes preserved

- `tests/test_UAT_FC_REQ-20_browser_budget.test.ts` — resolved working-tree file is **byte-identical** to `ed5168a3:tests/test_UAT_FC_REQ-20_browser_budget.test.ts` (verified via `git diff --no-index`, zero delta). Key incoming markers present: test renamed to "with an explicit 50s session cap, the 51st request is budget_exhausted", `const config = { sessionMaxSeconds: 50, dayMaxSeconds: 200 }` threaded into every `chargeBrowserBudget` call, and the new assertion `DEFAULT_BROWSER_BUDGET.sessionMaxSeconds >= 1_000_000_000`.

Final `git status --porcelain` shows no unmerged classes (UU/AA/DU/UD); the file is staged as `A`. The other three files from this cherry-pick (`browser-budget.ts`, the new BUG-17 test, REQ-22, REQ-51) were already staged cleanly with no conflict.

## Post-merge review flag (out of scope for this step, but noted)

This resync branch is missing the entire REQ-20 web-fetch-safety scaffolding — `_helpers_REQ-20_kv.ts`, `_helpers_REQ-20_r2.ts`, and 13 `test_UAT_FC_REQ-20_*` web-fetch tests (all present in current `main` via commit `5611abd7`, which is an ancestor of `main` but not of this branch). Already-replayed downstream consumers (REQ-21/22/51 helpers and the new BUG-17 test) import `./_helpers_REQ-20_kv.js`, so the vitest suite cannot resolve imports regardless of this conflict's resolution. Root cause: the branch base (`5c45ff22`) predates `5611abd7`, while resync commit-selection excluded `5611abd7` as already-reconciled. This is a resync-base/selection concern for the outer workflow, not resolvable inside this single conflict.
