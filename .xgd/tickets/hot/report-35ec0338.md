---
uid: report-35ec0338
id: REPORT-721
type: report
title: Claude fix_review_free_coded report
created_by: xgd
created_at: '2026-06-28T21:38:22.193810+00:00'
updated_at: '2026-06-28T21:38:22.193810+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_review_free_coded
  subject_uid: bundle-24c4d23c
---

All three critical fixes plus the warning are in place. Here is my summary.

## Issues fixed

**1. Quality gate — `test_UAT_AC604` failure (CRITICAL)**
The bundle deliberately renamed the deterministic fallback digest summary to `"Reference digest for ${sourceUrl}"` (`analyze-page.ts:497`), consistent with REQ-22's "Reference Digest" terminology used throughout the feature (the card title, the `reference_digest` tool_result kind). The old `"Static-fetch digest"` wording was also inaccurate — the fallback fires on the rendered path too, not just static fetch. I kept the new code wording and aligned the test:
- `tests/test_reconciliation_analyze_page_action.test.ts:230` and `:244` → now expect `"Reference digest for"`. The rename is now covered by AC604.

**2. Convert-flow cards never registered (CRITICAL)**
`packages/builder-ui/src/main.ts:7-9, 44-45` — imported and called `registerConvertConfirmation()` and `registerTranscribeProgress()` alongside the existing `registerDigestReport()`, so `kind: 'convert_confirmation'` and `kind: 'transcribe_site_done'` now have registered renderers in the live SPA (served via `spa.ts → bootBuilder`).

**3. Convert-flow trigger events had no source listeners (CRITICAL)**
`packages/builder-ui/src/main.ts:84-144` — installed document-level listeners for all three events, following the established `cf191dca`/BUG-4 bridge pattern (drive a synthetic user turn through `runChatTurn` so the AI re-invokes the operator action):
- `fc:digest-convert-requested` (from DigestReport "Convert this site") → "Convert this reference into a fresh draft: {url}."
- `fc:convert-confirmed` (from ConvertConfirmation) → "I confirm. Proceed with converting {url}." + ownership clause when `ownsSite`.
- `fc:convert-cancelled` → "Cancel the conversion of {url}."
- All three are removed in `destroy()` so re-mounting doesn't leak handlers. Verified the cards dispatch on `parent.ownerDocument`, the same `document` the listeners attach to.

**Warning — null-guard (builder-ui, allowed)**
`packages/builder-ui/src/components/transcribe-progress.ts` — `renderStage4Count` and `recordAssetMirrored` now treat a missing stage-4 node as a no-op (matching `setStageStatus`) instead of throwing on `as HTMLElement`.

**Deliberately not touched:** the `hexOf` duplication warning lives in the control-app operator layer, which the fix-it prompt instructed me to leave alone (it passed review). I made no changes to the extractor or control-app operator layers.

## Confidence
**High.** The two independent gate failures both have direct, mechanical fixes: the failing test now matches the intended code, and the dead-code/inert-UI findings are resolved by registration + the proven listener-bridge pattern. The full suite's single failure was AC604, now corrected; the wiring changes are additive and cleaned up on teardown, so they shouldn't regress the existing 536 passing tests. Per the mission I did not run quality checks — the workflow will re-run them and re-review.
