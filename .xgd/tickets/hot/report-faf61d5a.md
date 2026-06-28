---
uid: report-faf61d5a
id: REPORT-719
type: report
title: 'Code Review: bundle-24c4d23c (BUNDLE-4)'
created_by: xgd
created_at: '2026-06-28T21:33:57.600429+00:00'
updated_at: '2026-06-28T21:33:57.600429+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: code_review
  subject_uid: bundle-24c4d23c
  anchor_uid: bundle-24c4d23c
---

# Code Review

**Result**: FAIL

## Summary
Two independent gate failures. (1) A pre-existing reconciliation UAT (`test_UAT_AC604`) now FAILS: the bundle renamed the analyze-page digest summary prefix from `"Static-fetch digest for"` to `"Reference digest for"` (analyze-page.ts:497) without updating the existing test, and no new bundle test covers the rename. (2) Two new convert-flow chat cards (ConvertConfirmation, TranscribeProgress) are exported from the package barrel but never registered in `bootBuilder`, making them dead code in the live SPA. Extractor and control-app layers are otherwise clean and well-wired.

## Quality Gates
- **Lint**: success (0 errors, 0 warnings) — per report-4acfde4a.
- **Build**: success — per report-4acfde4a.
- **Tests**: **FAIL**. Independent full-suite run on this worktree: **1 failed | 536 passed (537 total)**. Failure: `tests/test_reconciliation_analyze_page_action.test.ts > test_UAT_AC604_ai_commentary_with_deterministic_fallback` (lines 230 & 244) — expected summary to contain `"Static-fetch digest for"`, received `"Reference digest for https://x.test/: ..."`.
- **Note on prior evidence**: the existing quality report (report-4acfde4a) ran 0 tests for this bundle — its `test_filter` targeted unrelated ACs (AC477–AC602), so `total: 0`. The reconciliation review (report-c3371aaa) ran only the 98-test FC subset and reported green; it did not run the full suite, so the regression in a pre-existing reconciliation test went undetected.

## External Interface Accessibility
New entry points wired in: **NO — gap found.**
- **Extractor**: PASS — all new exports (`shouldEscalateToRendered`, `renderedFetch`, `mergeComputedSignals`, `uploadScreenshots`, `buildTranscriptionDigest`, `collectReferencedAssetUrls`, `mirrorAssetBatchToR2`, etc.) re-exported via index.ts and consumed by control-app.
- **Control-app operator actions**: PASS — `transcribe_site` (registry.ts:402), `confirm_convert` (registry.ts:427), `read_transcription_digest` (registry.ts:449), and page-CRUD `add_page`/`remove_page`/`reorder_pages` are all registered and dispatchable; new `ASSETS_BUCKET`/`BROWSER` bindings declared in wrangler.toml; system-prompt how-to wired into chat.ts:486.
- **Builder-ui convert cards**: **FAIL** — `registerConvertConfirmation` and `registerTranscribeProgress` are re-exported from index.ts (lines 64, 70) but never called. `bootBuilder` (main.ts:43) calls only `registerDigestReport()`. The production entry `spa.ts` calls only `bootBuilder`. → cards for `kind: 'convert_confirmation'` and `kind: 'transcribe_site_done'` have no registered renderer in the live SPA (dead code; exercised only by tests).

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| packages/builder-ui/src/main.ts:43 | `bootBuilder` registers only DigestReport; ConvertConfirmation + TranscribeProgress never registered → dead in production SPA | CRITICAL |
| packages/builder-ui/src/components/convert-confirmation.ts:91,104 | Emits `fc:convert-confirmed`/`fc:convert-cancelled` CustomEvents; no source listener exists anywhere (grep hits are tests/comments only) | CRITICAL |
| packages/builder-ui/src/components/digest-report.ts:110 | Registered card emits `fc:digest-convert-requested` but has no source listener → "Convert this site" trigger is inert in the live app | CRITICAL |
| apps/control-app/src/operator/analyze-page.ts:497 | Digest summary prefix renamed to "Reference digest for"; breaks existing AC604 UAT, no new test covers the rename | CRITICAL |
| packages/builder-ui/src/components/transcribe-progress.ts:124-130,156-158 | `renderStage4Count`/`recordAssetMirrored` cast querySelector to HTMLElement without null-guard (unlike setStageStatus); missing node throws instead of no-op | WARNING |
| apps/control-app/src/operator/transcribe-site.ts + analyze-page.ts | `hexOf` helper duplicated across two files; candidate for shared util | WARNING |
| apps/control-app/src/chat.ts:419-446 | `summarizeSystemAction` has no case for transcribe_site/confirm_convert/read_transcription_digest (falls to default) — cosmetic summary text only | INFO |
| apps/control-app/src/operator/transcribe-site.ts:147-245 | SSE stage numbers emitted non-monotonically (1,2,4,3) — deliberate (assets before digest) but a stage-number-keyed FE could misorder | INFO |
| packages/builder-ui/src/components/digest-report.ts:152,213 | Scraped remote URLs flow into `<img src>` via setAttribute (no innerHTML XSS, but unsanitized trust boundary) | INFO |

## Smoke Test
Not run as a blocker — gate failures (failing test + dead convert cards) already determine the outcome. The dead-card finding is itself the smoke-test signal: the convert-flow UI cards cannot render or be triggered in the live SPA.

## Issues Found
**Critical (must fix)**:
- `test_UAT_AC604` fails: reconcile the digest summary wording. The rename to "Reference digest for" (analyze-page.ts:497) is uncovered by any new test and breaks the existing AC604 UAT.
- ConvertConfirmation + TranscribeProgress cards are never registered in `bootBuilder` → dead code in the live SPA.
- Convert-flow trigger events (`fc:digest-convert-requested`, `fc:convert-confirmed`, `fc:convert-cancelled`) have no source listeners → the convert UI chain is non-functional end-to-end, even for the registered DigestReport card.

**Warnings (should fix)**:
- Null-guard the stage-4 querySelector casts in transcribe-progress.ts.
- De-duplicate the `hexOf` helper shared by transcribe-site.ts and analyze-page.ts.

## Fix-It Prompt
Address all three CRITICAL items; do not modify the extractor or control-app operator layers (they passed).

1. **Fix the failing test `test_UAT_AC604` (Quality Gate).** Decide the intended digest summary wording and make code + test agree:
   - If "Reference digest for" is the intended new wording (aligns with the REQ-22 reference-digest concept), update `tests/test_reconciliation_analyze_page_action.test.ts` lines 230 and 244 to expect `"Reference digest for"`, and confirm AC604's acceptance criterion text matches.
   - Otherwise revert `apps/control-app/src/operator/analyze-page.ts:497` back to `"Static-fetch digest for ${sourceUrl}"`.
   - Then re-run the FULL suite (`npx vitest run tests/`), not just the FC subset — confirm 0 failures.

2. **Register the convert-flow cards in `bootBuilder`.** In `packages/builder-ui/src/main.ts`, import and call `registerConvertConfirmation()` and `registerTranscribeProgress()` alongside the existing `registerDigestReport()` at main.ts:43 (mirror the existing import on line 7). This makes `kind: 'convert_confirmation'` and `kind: 'transcribe_site_done'` cards renderable in the live SPA served via spa.ts.

3. **Wire the convert-flow trigger events to a listener in the live path.** The cards emit `fc:digest-convert-requested` (digest-report.ts:110), `fc:convert-confirmed` (convert-confirmation.ts:91), and `fc:convert-cancelled` (convert-confirmation.ts:104), but no source listener exists. Add listeners in the builder/chat driver (the bootBuilder/main.ts wiring) that translate these events into the corresponding operator actions (`transcribe_site`/`confirm_convert`). Without this the convert flow is inert end-to-end. (See recurring prior defects bug-52efd958/BUG-10 and BUG-4 for the same unwired-card pattern.)

4. **Re-verify** after fixes: full `npx vitest run tests/` is green AND the three convert cards are registered and their trigger events are handled in the non-test code path.
