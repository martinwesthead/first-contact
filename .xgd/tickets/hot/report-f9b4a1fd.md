---
uid: report-f9b4a1fd
id: REPORT-913
type: report
title: 'Reconciliation Review: BUNDLE-10 (commits)'
created_by: xgd
created_at: '2026-06-30T06:47:54.838735+00:00'
updated_at: '2026-06-30T06:47:54.838735+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-93cd5926
  anchor_uid: bundle-93cd5926
---

# Reconciliation Review: Story Coverage

**Result**: FAIL
**Mode**: commits
**Surface**: (commits / bundle)
**Anchor**: bundle-93cd5926
**Stories Reviewed**: 3 (STORY-56, STORY-71/story-bab9b773, STORY-53)

## Summary

Intent fidelity and story-level coverage are **strong**: all three stories faithfully
document the operator's stated intent (render-by-default, the new preview tool, the
effectively-infinite browser budget), and each explicitly flags the divergences from the
older escalation/finite-budget model rather than silently absorbing them. Plan-item
accounting passes (3 items → 3 stories).

The review **FAILS on Step 5b (evidence sufficiency)**: the bundle archived the
escalation ACs and removed `escalate.ts` / `shouldEscalateToRendered` / the `forceRendered`
input, and raised the default browser budget to effectively infinite — but the
corresponding UATs were **not** deleted or updated. Four stale UATs remain in the matrix
and **fail** (`npx vitest run`: 4 failed | 1092 passed). The reconciliation_test gate only
exercises changed UATs, so it did not catch these stale-UAT regressions on modified/archived ACs.

## Behavior Inventory

12 behaviors identified across the three features (analyze render-by-default; preview_generated_page
incl. asset inlining + degraded signals + data-URL nav; browser-budget effectively-infinite defaults).
All are documented by a story (see Coverage Map). Coverage is not the problem — evidence is.

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | analyze_page renders by default; static is degraded fallback | Covered | STORY-56 | Story body + AC-617/AC-822 (render_by_default file) faithful |
| 2 | forceRendered input + shouldEscalateToRendered heuristic removed | Covered | STORY-56/STORY-55 | Stories flag archival of AC-597/610/611 + escalate.ts deletion |
| 3 | Budget exhaustion degrades analyze to static (AC-618) | Covered (canonical) but **stale duplicate FAILS** | STORY-56 | render_by_default AC-618 passes; rendered-file AC-618 fails |
| 4 | Multimodal commentary (AC-620) | Covered ONLY in stale file | STORY-56 | Must be preserved if stale file is removed |
| 5 | Screenshot strip first (AC-621) | Covered ONLY in stale file | STORY-56 | Must be preserved if stale file is removed |
| 6 | preview_generated_page tool (PreviewDigest, previewSource, previews/ prefix) | Covered | STORY-71 | AC-823..AC-838 faithful |
| 7 | BUG-15 local /assets inlining + graceful missing-asset | Covered | STORY-71 | AC-833 / AC-834 |
| 8 | data:-URL inline nav + synthetic preview:// sourceUrl | Covered | STORY-71 | AC-832; divergence from REQ-51 AC1 noted in story body |
| 9 | Degraded structural signals when BROWSER absent / budget exhausted | Covered | STORY-71 | AC-830 / AC-831 |
| 10 | DEFAULT_BROWSER_BUDGET effectively infinite (1e9) | Covered | STORY-53 | AC-565 / AC-566 reframed; AC-839 added |
| 11 | Enforcement machinery preserved; finite cap only under config override | Covered | STORY-53 | AC-565/566 exercised via explicit small config |
| 12 | content-addressed draftId stable across asset availability | Covered | STORY-71 | AC-825 |

## Ungrounded Stories

None. No story claims behavior unsupported by intent or code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. analyze_page rendered fetch (render-by-default) | STORY-56 (+ STORY-55) | ✓ |
| 2. preview_generated_page (AI draft self-preview) | STORY-71 / story-bab9b773 | ✓ |
| 3. Browser-rendering budget defaults | STORY-53 | ✓ |

## Step 5b — Evidence Sufficiency Failures (the blocking gap)

`npx vitest run` over the full suite: **4 failed | 1092 passed**. All four failures are stale
UATs left behind by this bundle's reconciled removals:

1. **AC-618 (STORY-56) — active AC has a FAILING UAT.**
   `tests/test_reconciliation_analyze_page_rendered.test.ts:124`
   `test_UAT_AC618_budget_exhaustion_degrades_to_static_without_failing` asserts
   `digest.fetchPath === 'static'` but receives `'rendered'`. Root cause: BUG-17 raised
   `DEFAULT_BROWSER_BUDGET` to 1e9, so charging the default budget no longer exhausts it and
   the static fallback never triggers. The **canonical** AC-618 test in
   `tests/test_reconciliation_analyze_page_render_by_default.test.ts` already handles this
   correctly (it forces exhaustion via seeded KV / explicit config) and passes.
   → Remediation: this file (`..._rendered.test.ts`) is a stale duplicate of
   `..._render_by_default.test.ts` for AC-617/AC-618/AC-622. Remove the duplicated
   AC-617/AC-618/AC-622 cases from it, **but preserve AC-620 and AC-621** (multimodal
   commentary + screenshot-strip), which are AC-tagged ONLY in this file — move them into
   the canonical render_by_default file rather than deleting them with the file.

2. **AC-597 / AC-610 / AC-611 — orphaned UATs for ARCHIVED escalation ACs fail the suite.**
   The bundle deleted `packages/extractor/src/escalate.ts` and `shouldEscalateToRendered`
   (confirmed: `shouldEscalateToRendered is not a function`) and removed the `forceRendered`
   input. STORY-55/STORY-56 reconciliation notes correctly archive AC-597/610/611, but their
   test files were never removed and now exercise deleted code:
   - `tests/test_UAT_AC597_thin_body_escalates_content_rich_stays_static.test.ts` (FAIL — `shouldEscalateToRendered is not a function`)
   - `tests/test_UAT_AC610_js_dominant_document_escalates.test.ts` (FAIL)
   - `tests/test_UAT_AC611_force_rendered_escalates_unconditionally.test.ts` (FAIL)
   → Remediation: delete these three orphaned test files; their ACs are archived per the plan.

3. **AC-617 / AC-622 — stale escalation-framed evidence (passes for the wrong reason).**
   Still in `tests/test_reconciliation_analyze_page_rendered.test.ts`:
   `test_UAT_AC617_escalates_to_rendered_path_*` passes `forceRendered: true` (a removed input)
   and `test_UAT_AC622_end_to_end_spa_escalation_*` frames the AC as escalation. These currently
   pass only incidentally — render-by-default yields a rendered digest regardless of the removed
   escalation gate — so they would pass even though the escalation behavior they purport to test
   no longer exists. They are not valid evidence for the modified (render-by-default) ACs.
   → Remediation: superseded by the render_by_default file's AC-617/AC-622; remove them.

## Judgment Calls

- Intent fidelity / coverage **PASS** in isolation — the stories are accurate, complete, and
  explicitly flag every divergence (render-by-default ground-truth notes, BUG-15 inline-nav
  divergence, BUG-17 default-budget change). A developer reading the stories would have a
  correct mental model.
- The FAIL is driven entirely by Step 5b: an **active** AC (AC-618) has a failing UAT, and the
  reconciliation left orphaned UATs for archived ACs (597/610/611) that turn the matrix red.
  These are material — CI is red and the evidence for AC-617/AC-618/AC-622 is unsound — not
  trivial omissions.
- `test_UAT_AC791_static_digest_force_rendered_upgrade` and
  `test_UAT_FC_REQ-49_transcribe_site_forces_rendered` PASS and concern the separate
  `transcribe_site` tool (which legitimately forces rendering); out of scope, no action.

## Verdict

**FAIL.** Stories faithfully represent the operator's intent and all plan items produced output,
but Step 5b evidence sufficiency fails: the bundle archived the escalation ACs (deleting
`escalate.ts` / `shouldEscalateToRendered` / `forceRendered`) and raised the default browser
budget to effectively infinite, yet four stale UATs exercising the removed behavior were never
deleted or updated and now fail (`4 failed | 1092 passed`). The fix loop must (a) remove the three
orphaned archived-AC test files (AC-597/610/611), and (b) collapse the duplicate
`test_reconciliation_analyze_page_rendered.test.ts` into the canonical
`test_reconciliation_analyze_page_render_by_default.test.ts` — fixing the AC-618 budget-exhaustion
case for the infinite-budget world and PRESERVING AC-620 and AC-621 coverage in the process.
