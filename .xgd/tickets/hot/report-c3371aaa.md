---
uid: report-c3371aaa
id: REPORT-716
type: report
title: 'Reconciliation Review: commits (BUNDLE-4)'
created_by: xgd
created_at: '2026-06-28T21:27:55.568159+00:00'
updated_at: '2026-06-28T21:27:55.568159+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-24c4d23c
  anchor_uid: bundle-24c4d23c
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Anchor**: bundle-24c4d23c (REQ-22 + REQ-28 + BUG-1 + REQ-30 + REQ-31)
**Subject (intent)**: bundle-24c4d23c
**Stories Reviewed**: 8 distinct (story-3f73931a, story-15bae45e, story-b3866352, story-f45a5e61, story-5d1952ba, story-e893e643, story-2524a1ae, story-ba9f2715)

## Method

Read intent first (full bundle body + all five REQ sub-tickets + the 2026-06-24 amendment), then read code independently to build a behavior inventory, then mapped stories against both. Verified code ground truth with targeted greps and read the FC tests. Ran the full FC suite: **28 files / 98 tests, all passing**.

## Behavior Inventory (9 features, from the 11 [FREE-CODED] commits)

1. renderedFetch / escalation heuristic / computed-signal merge / screenshot upload (packages/extractor)
2. analyze_page rendered wiring + budget-exhaustion fallback + multimodal commentary + DigestReport screenshot strip
3. transcribe_site mechanical orchestration + confirm_convert + system-prompt how-to wiring
4. TranscriptionDigest derivation primitives + read_transcription_digest read-back
5. Asset mirroring to R2 (single + batch, dedup, failure taxonomy)
6. Page-CRUD state-edit tools (add_page / remove_page / reorder_pages)
7. Convert-flow chat cards (ConvertConfirmation + TranscribeProgress)
8. Builder chat input CSS regression fix (BUG-1)
9. Preview-panel Reset button (REQ-31)

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | renderedFetch/escalation/computed signals | Covered | story-3f73931a | escalate.ts verified: thin_body/js_dominant/forceRendered |
| 2 | analyze_page rendered wiring + DigestReport strip + multimodal | Covered | story-15bae45e | forceRendered param + budget fallback verified |
| 3 | transcribe_site mechanical orchestration | Covered | story-b3866352 | synthesis path confirmed removed from production |
| 4 | TranscriptionDigest derivation + read_transcription_digest | Covered | story-f45a5e61 | buildTranscriptionDigest/deriveThemeTokens/extractPageContent present |
| 5 | asset mirroring to R2 | Covered | story-5d1952ba | mirror-asset.ts; failure taxonomy + avif/mov superset flagged |
| 6 | page CRUD tools | Covered | story-e893e643 | tools.ts; id-collision stricter guard flagged in story |
| 7 | convert-flow chat cards | Covered | story-2524a1ae | transcribe_site_done registration-key divergence flagged |
| 8 | builder chat input CSS (BUG-1) | Covered | story-ba9f2715 | .fc-chat__editor rules present, .fc-chat__textarea removed |
| 9 | preview-panel Reset button (REQ-31) | Covered | story-ba9f2715 | onReset + injectable confirm/reload/storageKey verified |

No uncovered or partially-covered behaviors. No ungrounded stories (every story claim is supported by code).

## Intent Fidelity — the central judgment call

**The 2026-06-24 render-by-default amendment is handled correctly (NOT silent divergence absorption).** REQ-22's body carries an amendment that inverts escalation to render-by-default and removes `shouldEscalateToRendered` + `forceRendered`. The reconciled code implements the *escalation-heuristic* version (verified: `packages/extractor/src/escalate.ts` defines `shouldEscalateToRendered` with `THIN_BODY_TEXT_LIMIT=200`, `JS_DOMINANT_RATIO=0.8`, and `forceRendered`; `analyze-page.ts:115` calls it; render-by-default is absent). The amendment is REQ-49 work, not among this bundle's 11 commits. Both story-3f73931a (Reconciliation note) and story-15bae45e (Divergence note for regression) **explicitly flag** that the amendment is REQ-49 and not reconciled here, naming the escalation-heuristic behaviour as ground truth. This is the required treatment: capture code+intent reality and note the discrepancy, rather than silently absorb it.

All other implementation deviations are likewise flagged in story divergence notes and verified against code:
- Digest lookup from FETCH_CACHE_KV (not chat history) — REQ-23/24 deferred (story-b3866352).
- In-memory chat metadata for consent + robots override (story-b3866352).
- Synchronous inline staging; stage numbering screenshot=1/theme=2/asset=4/digest=3 (story-b3866352).
- siteId == accountId in the R2 digest key (story-b3866352).
- Per-module confidence dropped per REQ-30 OUT (story-b3866352, story-f45a5e61).
- Progress card registered under kind `transcribe_site_done` vs the REQ-28 spec's `transcribe_progress` (story-2524a1ae).
- Mirror classifier superset (avif/mov) over stated png/jpeg/webp/svg/gif/mp4/webm (story-5d1952ba).
- add_page id-collision guard stricter than spec (story-e893e643).

REQ-30 superseding REQ-28 within the bundle is documented as the cumulative net state; the deleted Opus-synthesis primitives are correctly NOT given capability documentation (grep confirms they are absent from production code).

## Plan Item Accounting

| Plan Item | Type | Expected Story | Status |
|-----------|------|----------------|--------|
| 1. extractor rendered path (REQ-22) | upgrade | story-3f73931a | OK |
| 2. analyze_page wiring + DigestReport strip (REQ-22) | upgrade | story-15bae45e | OK |
| 3. transcribe_site orchestration (REQ-28/30) | feature | story-b3866352 | OK |
| 4. TranscriptionDigest derivation + read-back | feature | story-f45a5e61 | OK |
| 5. asset mirroring to R2 | feature | story-5d1952ba | OK |
| 6. page CRUD tools | feature | story-e893e643 | OK |
| 7. convert-flow chat cards | feature | story-2524a1ae | OK |
| 8. builder chat input CSS (BUG-1) | upgrade | story-ba9f2715 | OK |
| 9. preview-panel Reset button (REQ-31) | upgrade | story-ba9f2715 | OK |

All 9 plan items produced their corresponding story. None dropped.

## Evidence Sufficiency (Step 5b)

Full FC suite executed locally: **28 files, 98 tests, all pass.** Every plan item is proven by at least one FC UAT, and the FC test set on disk maps 1:1 to plan items (the 6 deleted REQ-28 synthesis FC tests are correctly absent, consistent with the net state).

Behavioral entry points confirmed (not internal mocking, not bypassing real interfaces):
- `test_UAT_FC_REQ-30_killer_demo_mocked` and `_multi_page_demo` drive the real `handleChatRequest` chat loop end-to-end, use the real transcribe harness + extractor schema + framework catalog, and mock only the upstream Anthropic fetch (external boundary — the REQ-30 sanctioned LLM mock). Assertions observe real outcomes (transcribe status ok, inventory r2Keys under `sites/{acct}/imports/`, theme tokens applied, image fields resolving to `/assets/`).
- `test_UAT_FC_REQ-30_system_prompt_includes_howto` invokes real `handleChatRequest`, captures the upstream system prompt, and asserts the how-to doc content reached it (AC6) — genuine behavioral evidence, not just the byte-for-byte drift guard.
- REQ-22 escalation tests assert distinct discriminated outcomes (thin_body / js_dominant / operator-forced) on the real `shouldEscalateToRendered` library function; budget-exhausted fallback, screenshot upload, and merge UATs exercise the real primitives with an injected fake browser driver.

Judgment call (acceptable, not a failure): `test_UAT_FC_REQ-30_synthesis_code_removed` (AC5/AC11) is a source-inspection test (readFileSync + regex over transcribe.ts / index.ts / transcribe-site.ts). Source inspection is normally insufficient behavioral evidence, but here it guards a code-ABSENCE property ("No Legacy Modes" — a deleted function has no runtime behaviour to observe), and the behavioral consequence (transcribe_site is mechanical, returns `{kind:'transcribe_site_done', digestKey, summary}` with no synthesized site) is independently proven by `digest_written_to_r2`, `transcribe_site_stages`, and the killer-demo UATs. The absence-guard is supplementary, not the sole evidence for the behavior.

## Judgment Calls

- Render-by-default amendment treated as out-of-bundle (REQ-49) and explicitly flagged by the two affected stories — faithful, PASS.
- `synthesis_code_removed` source-inspection test accepted as a code-absence guardrail with behavioral coverage elsewhere — PASS.
- Observation (not blocking, outer-workflow scope): the per-story reconciliation_test report (REPORT-663) and Test Naming Check (REPORT-662) report "no test files" for story-3f73931a — an artifact of the FC→AC test-rename/linking stage of the outer reconcile run, which is outside this review's scope. The underlying FC UATs exist and pass when executed directly.

## Verdict

PASS: Stories faithfully represent the operator's stated intent and accurately document what the 11 reconciled commits implement. The one material intent/code divergence (render-by-default amendment) is explicitly flagged rather than silently absorbed; all secondary deviations are noted in story divergence sections. All 9 plan items produced stories, all observed behaviors are covered, no story claims invented behavior, and every behavior is backed by passing behavioral UATs that a broken implementation could not satisfy. A developer reading these stories would have a correct mental model of what this bundle intended to build and what the code does.