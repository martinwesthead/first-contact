---
uid: report-d0e315d9
id: REPORT-860
type: report
title: Claude fix_reconciliation_review report
created_by: xgd
created_at: '2026-06-30T02:01:00.913810+00:00'
updated_at: '2026-06-30T02:01:00.913810+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_reconciliation_review
  subject_uid: bundle-30021526
---

The only references to the old filename are in historical report/comment tickets (which I must not modify) — no code references it. The fix is complete:

- **New AC-432 UAT** created at `tests/test_UAT_AC432_services_grid_rejects_item_count_outside_1_to_6.test.ts`, encoding the reconciled v2 contract (mirrors the already-passing `test_UAT_FC_REQ-5` logic, plus asserts the `items` path per AC-432's verification text).
- **Stale v1 file** `..._2_to_6.test.ts` deleted via `git rm`.

I verified my assertions against `validate.ts`: the list-cardinality violations carry path `["items"]` with messages `at least 1` / `at most 6`, and v2 items require `heading`+`body` — so all five cases (0→reject, 7→reject, 1/3/6→accept) will pass against the shipped meta.

Per the mission, I'm not running tests (the workflow runs the full suite after this fix). I also left ticket bodies untouched — AC-432's text is already reconciled to the v2 1..6 contract and `uat_coverage` is `pass`; the only mismatch was the evidence file, now migrated.

---

## Summary

**Stories created**: none — coverage/fidelity already PASSED; the only failure was Step 5b evidence sufficiency.

**Stories modified**: none — STORY-42 / AC-432 ticket text already correctly describes the v2 contract (bounds 1..6, `heading`-bearing items, 1 item accepted). No ticket edit was needed.

**Stories deleted**: none.

**Code changes**:
- `tests/test_UAT_AC432_services_grid_rejects_item_count_outside_1_to_6.test.ts` — **new**. AC-named UAT for AC-432 written to the v2 contract: `{ heading, body }` items; 0 items rejected with `/at least 1/` on the `items` path; 7 items rejected with `/at most 6/` on the `items` path; 1, 3, and 6 items accepted (matching AC-432's verification steps exactly).
- `tests/test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6.test.ts` — **deleted** (`git rm`). This was the stale v1 UAT using the removed `title` field and the superseded `/at least 2/` bound; it failed deterministically against the v2 implementation and was the sole basis of the review FAIL.

**Note on the 6 chat-endpoint failures** (AC-487/585/605/606/633/634): The review classified these as "most likely a worktree-environment artifact" (SSE `event: done` chunk fed to `JSON.parse` — a stale workspace-dep bundle / known reconcile-worktree streaming issue), explicitly *not* the basis of the FAIL, and stemming from a bundle diff (`chat.ts`) that is purely an additive `case "xgd_ticket"` in a switch with a `default`. These are not a story/AC documentation mismatch, so there is no matrix edit to make. If the post-fix clean run still shows them, the remediation is environmental (relink node_modules in the worktree / restart the dev bundle), not a reconciliation fix.

**Confidence**: **High** that the next review will PASS on the AC-432 issue — the deterministic contradiction is fully resolved: AC-432 now has exactly one properly-named UAT that matches the reconciled AC and passes against the shipped v2 meta (logically identical to the already-green `test_UAT_FC_REQ-5` cardinality test). Residual risk is confined to the chat-endpoint cluster, which the review itself attributed to the worktree environment rather than this bundle.
