---
uid: report-7f7b31b1
id: REPORT-765
type: report
title: 'Reconciliation Review: commits (BUNDLE-5)'
created_by: xgd
created_at: '2026-06-29T00:19:28.305203+00:00'
updated_at: '2026-06-29T00:19:28.305203+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-d4ce3987
  anchor_uid: bundle-d4ce3987
---

# Reconciliation Review: Story Coverage

**Result**: FAIL
**Mode**: commits
**Surface**: (n/a — commits/bundle mode)
**Anchor**: bundle-d4ce3987 (BUNDLE-5)
**Stories Reviewed**: 7 (STORY-46 ×2 [REQ-32, BUG-3], STORY-38, STORY-62, STORY-57, STORY-61, STORY-58, STORY-60)

## Method

Intent read from all 10 source tickets (BUG-3/4/5/7/10, REQ-14/32/33/34/35) bodies + comments. Code read independently across packages/builder-ui, packages/framework, packages/site-schema, packages/extractor, apps/control-app, tools/generate, scripts, docs. Every bundle-delta AC mapped to its `test_UAT_*` file and the test **executed** (`npx vitest run`). NOTE: the regression report REPORT-764 recorded "pass (0 tests)" because vitest did not execute in the regression worktree; after relinking, the bundle UATs run — and **6 tests fail** (see gaps), so the regression's green was an artifact of non-execution, not real evidence.

## Intent Fidelity — PASS

Stories faithfully represent the operator's net intent, including the bundle's internal supersessions:
- **BUG-4 correctly net-removed.** STORY-57/STORY-61 document the *deletion* of the ConvertConfirmation gate (superseded by REQ-35); no story re-expresses the obsolete "wire the confirm buttons" intent. The surviving x-session-id infra is correctly treated as non-capability latent infra.
- **BUG-10 issue 2 correctly excluded.** STORY-61 documents only issue 1 (registerTranscribeProgress wiring); the deferred blank-iframe / add_module-explicit-id fix is not claimed as delivered.
- **REQ-14 scope correct.** STORY-60 does not falsely claim add_page/remove_page/reorder_pages (absorbed by REQ-30); only set_nav_pattern/set_nav_entries/set_page_metadata/duplicate_module are attributed to this bundle.

## Coverage Map (bundle-delta behaviours)

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | REQ-32 send-blocking (disable+spinner+aria-busy, suppress re-entry, editor editable, reset on resolve+reject) | Covered | STORY-46 | AC-673..676 implemented + passing UATs |
| 2 | BUG-3 preview target option + #/<pageId> nav, hashchange re-render, anchor/unknown fallback | Covered | STORY-46 | AC-677..680 implemented + passing UATs; production output byte-unchanged verified |
| 3 | BUG-7 bundler --watch + one-shot + concurrent dev | Covered (1 weak) | STORY-38 | AC-681/682 behavioral PASS; AC-683 evidence weak (gap 3) |
| 4 | REQ-33 markdown content union, HTML sniff, resolver, verbatim capture, write_text_asset, build-time bake | Covered | STORY-62 | AC-684..697 implemented + passing UATs |
| 5 | REQ-35+REQ-34 immediate convert + unconditional Stage-0 clear + cleared SSE | Covered | STORY-57 | AC-624/698/699/700 implemented + passing UATs |
| 6 | REQ-35+BUG-10+REQ-34 boot-registered 5-row progress card, no confirmation route | Covered | STORY-61 | AC-662/666/701/702 have correct passing UATs — BUT a superseded duplicate test contradicts them and fails (gap 1) |
| 7 | BUG-5 precomputed image assetRef in digest | Covered | STORY-58 | AC-703 implemented + passing UAT |
| 8 | BUG-5/REQ-14 how-to instructs AssetRef + exposes new tools at runtime | UNCOVERED at runtime | STORY-58 / STORY-60 | AC-704 drift-guard FAILS: runtime prompt mirror omits REQ-14 tool docs (gap 2) |
| 9 | REQ-14 nav/page-metadata/duplicate tools + superRefine cross-ref validation | Covered | STORY-60 | AC-705..717 implemented + passing UATs (AC-717 doc sub-clause affected by gap 2) |

## Evidence Sufficiency Failures (Step 5b)

### GAP 1 — Superseded confirmation-gate test not removed (REQ-35 intent unmet)
`tests/test_reconciliation_convert_flow_cards.test.ts` encodes the **pre-REQ-35** design: it asserts a **4-row** progress card (line 202: `expect(rows).toHaveLength(4)`) and the ConvertConfirmation card / `registerConvertConfirmation` flow. It imports a symbol deleted by REQ-35 and **fails 5 tests**, directly contradicting active **AC-662** (no convert_confirmation route) and **AC-666** (info-toned **5-row** card). REQ-35's stated intent explicitly declared the REQ-28/BUG-4 confirmation UATs removed; this file is the orphan that was never deleted. The correct replacement (`tests/test_reconciliation_transcribe_progress_card.test.ts`) already covers AC-662/AC-666/AC-701/AC-702 behaviorally and passes.
- **Remediation**: delete `tests/test_reconciliation_convert_flow_cards.test.ts`. Story owner: story-2524a1ae (STORY-61).

### GAP 2 — Runtime system-prompt mirror drift: REQ-14 tool docs not loaded (real defect)
`apps/control-app/src/llm-context.ts` exports `REPRODUCING_A_WEBSITE_DOC`, the constant that builds the AI **system prompt at runtime**. It is out of sync with `docs/llm-context/reproducing-a-website.md`: the `.md` carries the REQ-14 tool documentation (§8 "Beyond convert — other edit tools": `duplicate_module`, `set_page_metadata`, `set_nav_pattern`, `set_nav_entries`) but the inlined `.ts` constant omits that section. Because the prompt is built from the `.ts` mirror, the AI is **never shown the new REQ-14 tools** — so **AC-704** (how-to instructs the AssetRef/tool format) and the documented-at-runtime sub-clause of **AC-717** are unmet at runtime. The drift-guard UAT `tests/test_UAT_FC_BUG-5_doc_states_assetref_format.test.ts` correctly **FAILS** (`expect(REPRODUCING_A_WEBSITE_DOC).toBe(fromDisk)`). This is a genuine intent↔code divergence, not a test artifact.
- **Remediation**: regenerate/sync the `REPRODUCING_A_WEBSITE_DOC` constant in `apps/control-app/src/llm-context.ts` from `docs/llm-context/reproducing-a-website.md` (add the missing §8 tool block incl. the "Wire up the nav" step). Story owners: story-f45a5e61 (STORY-58, AC-704) and story-e893e643 (STORY-60, AC-717).

### GAP 3 — AC-683 covered only by source-inspection (evidence weakness)
**AC-683** ("control-app dev command runs the bundle watcher alongside wrangler dev concurrently") is covered only by a test that `readFileSync`s `apps/control-app/package.json` and string-matches the `dev` script for `concurrently`/`build:bundle:watch`/`wrangler dev`. It never spawns the command and never verifies both processes launch or tear down (`-k`). Per Step 5b, source-inspection is not behavioral evidence; the concurrent-launch behaviour is unverified. The sibling AC-681 (watch rebuild) and AC-682 (one-shot) ARE genuinely behavioral (spawn the real `.mjs`). Lower materiality given wrangler is heavy to spawn in CI, but it should be a behavioral smoke test or an explicitly accepted limitation.
- **Remediation**: add a behavioral check that `pnpm dev:control` launches both processes (or document the limitation). Story owner: story-067dc2f8 (STORY-38).

## Accepted (non-blocking) evidence notes
- **AC-673** CSS sub-claims are source-grepped (jsdom cannot observe animation/layout); the load-bearing DOM state (disabled/aria-busy/data-fc-chat-send-busy) IS behaviorally asserted. Acceptable.
- **AC-695** doc-content AC — necessarily doc-inspection; acceptable for a doc-content claim.
- **AC-677/AC-678** are byte-identical duplicate ACs/tests; no lost coverage, but AC-678 adds nothing.
- **AC-714** "refs by reference" is implemented via `structuredClone` (deep copy); contract validated as new-UUID + deep equality. Low risk; note wording mismatch.

## Ungrounded Stories

None. No story claims behaviour unsupported by intent or code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. Builder UI — chat panel (REQ-32) | story-ba9f2715 (STORY-46) | OK |
| 2. Builder UI — live preview (BUG-3) | story-ba9f2715 (STORY-46) | OK |
| 3. Deploy/build pipeline — dev tooling (BUG-7) | story-067dc2f8 (STORY-38) | OK |
| 4. Framework — markdown content + capture (REQ-33) | story-ddc928fd (STORY-62, new) | OK |
| 5. Convert flow — orchestration (REQ-35+34) | story-b3866352 (STORY-57) | OK |
| 6. Convert flow — chat cards (REQ-35+BUG-10+34) | story-2524a1ae (STORY-61) | OK |
| 7. Convert flow — transcription digest (BUG-5) | story-f45a5e61 (STORY-58) | OK |
| 8. AI tool surface — nav/page/duplicate (REQ-14) | story-e893e643 (STORY-60) | OK |

All 8 plan items produced output. No plan items dropped.

## Judgment Calls

- GAP 1 flagged as material: a failing test that asserts the *opposite* of an active AC pollutes the evidence set and the suite is red; REQ-35 intent explicitly required its removal.
- GAP 2 flagged as material: it is a real runtime regression (the AI tool-surface documented by REQ-14 is invisible to the model at runtime), caught by a legitimate behavioral drift guard. This is silent intent↔code divergence the matrix would otherwise absorb as "documented."
- GAP 3 flagged but lower severity: borderline Step-5b source-inspection; behavioral siblings exist for the same feature.
- AC-673 CSS grep, AC-695 doc grep accepted: no behavioral alternative exists for those specific sub-claims.

## Verdict

**FAIL.** Story intent fidelity and plan-item accounting are sound, but evidence sufficiency fails: (1) a superseded confirmation-gate test (`test_reconciliation_convert_flow_cards.test.ts`) was never deleted and fails while contradicting active AC-662/AC-666; (2) AC-704's drift guard fails, exposing a genuine runtime defect — the system-prompt mirror `apps/control-app/src/llm-context.ts` omits the REQ-14 tool documentation, so AC-704 and AC-717's runtime sub-clause are unmet. The fix loop (`fix_reconciliation_review`) should: delete the superseded test file; sync the `REPRODUCING_A_WEBSITE_DOC` constant with the `.md`; and strengthen AC-683 evidence (or document the limitation).