---
uid: report-92c8ae79
id: REPORT-803
type: report
title: 'Reconciliation Review: commits (BUNDLE-6)'
created_by: xgd
created_at: '2026-06-29T22:53:33.831335+00:00'
updated_at: '2026-06-29T22:53:33.831335+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-4e8020d6
  anchor_uid: bundle-4e8020d6
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: (n/a — commits mode)
**Anchor**: bundle-4e8020d6 (BUNDLE-6)
**Stories Reviewed**: 5 unique (STORY-63, STORY-53, STORY-58, STORY-46, STORY-42); 7 plan-item slots

## Behavior Inventory

7 behaviors implemented across the 11 bundled commits (4 are pure version bumps with no behavior):

1. D1 data model — accounts/sites/revisions migrations (0002-0005), reversible down-migrations, slug validation/reservation/suggestions, global-unique slug, 1stcontact bootstrap seed (REQ-10, 8ea7a82).
2. web-fetch-safety consumer build hygiene — `KVNamespace` imported as a type so consumers (extractor) compile without declaring `@cloudflare/workers-types` (BUG-11, a59e985).
3. Transcription digest robustness — stage-0 prior-digest eviction, write read-back verification (`capturedAt`), `not_ready` status, per-URL `summary.assetFailures` (REQ-37 server, e5cec1a).
4. Builder chat XGD-parity + SSE streaming — progressive assistant bubble, round Send/Stop swap, user-message markdown, rounded-pill input, collapsible tool-use pane, bare-Enter-to-send (REQ-36, be19e5f).
5. Chat-loop tool-call failure integrity — per-call try/catch so one thrower yields a structured ok:false without dropping siblings; pendingToolFailures panel + next-turn re-injection (REQ-38 3a47635 + REQ-37 client e5cec1a).
6. image-gallery@v1 module — grid (1:1) + masonry (CSS column-count), columns/gap/spacing/surface dials, items[] 2..24, responsive collapse, lazy/async img (REQ-41, 6f3fa5a).
7. reproduce-a-website how-to names image-gallery — doc + inlined `REPRODUCING_A_WEBSITE_DOC` mirror (REQ-41, 0dcaa39).

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | D1 accounts/sites/revisions + slug + seed | Covered | story-a3283461 (STORY-63) | New feature; 9 ACs; documented deviations (4-digit migration numbering, down-migrations dir, deterministic seed IDs) captured faithfully |
| 2 | web-fetch-safety consumer build hygiene | Covered | story-a0482aed (STORY-53) | AC-727; runtime fetch contract unchanged — captured as upgrade, no parallel impl |
| 3 | Transcription digest robustness | Covered | story-f45a5e61 (STORY-58) | AC-728/729 added, AC-641 modified (per-URL assetFailures) |
| 4 | Builder chat parity + streaming | Covered | story-ba9f2715 (STORY-46) | 4 new ACs; AC-486/581/673/676 modified in place; inline ChatCard kept alongside tool-pane per operator decision |
| 5 | Chat-loop tool-call failure integrity | Covered | story-ba9f2715 (STORY-46) | 2 new ACs; REQ-38 correctly depends on REQ-36 SSE structure; REQ-37 decision-4 client work correctly split here from STORY-58 |
| 6 | image-gallery@v1 module | Covered | story-f1e061ba (STORY-42) | AC-736..740 added, AC-442 modified (registry resolves 6 modules) |
| 7 | how-to names image-gallery | Covered | story-f45a5e61 (STORY-58) | AC-741; depends on item 6 (module must exist) |

No uncovered or partially-covered behaviors. The 4 version-bump commits (a1ed699, 9121fdd, 395e2bc, ff2c55d) carry no behavior and correctly receive no story.

## Ungrounded Stories

None. Every story claim is grounded in both the source-ticket intent and the implementing code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. Site Data Model & Persistence (D1) | story-a3283461 (new) | OK |
| 2. External Fetch Safety (web-fetch-safety) | story-a0482aed | OK |
| 3. Convert Flow — digest robustness | story-f45a5e61 | OK |
| 4. Builder chat rebuild + streaming | story-ba9f2715 | OK |
| 5. Chat-loop tool-failure integrity | story-ba9f2715 | OK |
| 6. Module catalog — image-gallery@v1 | story-f1e061ba | OK |
| 7. Convert how-to names image-gallery | story-f45a5e61 | OK |

All 7 plan items produced output. None dropped.

## Evidence Sufficiency (Step 5b)

92/92 bundle UATs pass (verified by direct execution, vitest). Each new AC has a covering UAT that enters a real interface and would fail if the behavior regressed:

- **REQ-10** (8 files, 53 assertions): migrations applied against a real in-memory D1; reversibility, unique-constraint violation, and seed-definition-validates-against-validateSite all assert observable DB/parse outcomes.
- **BUG-11 / AC-727**: second assertion runs a real `pnpm --filter @1stcontact/extractor build` (1.06s) — a regression of the type-import bug reintroduces TS2304 and fails the test. (The first assertion is supplementary source-inspection; the build assertion is the decisive behavioral evidence.)
- **REQ-37 server**: `makeTranscribeHarness` drives the real transcribe-site code against a real R2-bucket boundary mock; asserts the digest was evicted/replaced (capturedAt changed), delete ordering vs SSE events, read-back verification, and `not_ready` status.
- **REQ-36 / REQ-38**: import the real `handleChatRequest` and real `applyToolCall`, thin-mock only the Anthropic fetch boundary, consume real SSE. REQ-38 forces one call to throw and asserts 3 tool_results (2 ok, 1 structured error) survive — removing the try/catch collapses the turn and fails the test.
- **image-gallery / AC-736..740**: render the real Astro module and assert DOM/CSS outcomes (tile-per-item, masonry column-count, conditional heading/caption, modifier classes, item-count rejection).

No UAT mocks repository-owned internal components; thin-mocks are confined to external boundaries (R2, Anthropic) per the composition thin-mock strategy.

## Judgment Calls

- **AC-741 (how-to names image-gallery) is a content-assertion test** — it reads `reproducing-a-website.md` and the exported `REPRODUCING_A_WEBSITE_DOC` constant and asserts they contain the image-gallery guidance. This is NOT a disallowed source-inspection test: the artifact under test is itself the deliverable — `REPRODUCING_A_WEBSITE_DOC` is injected verbatim into the AI's system prompt at runtime, so its content *is* the runtime behavior. Content assertion is the appropriate and only available evidence form for a prompt-content AC, and it guards the mention against silent drift. Acceptable.
- **`extractAccountId` remains header-driven** (REQ-10 coordination note) — explicitly deferred to the auth REQ and marked out-of-scope by STORY-63, not a silent divergence.
- **Pre-existing doc-drift failures** (BUG-5 / REQ-30) noted in REQ-36/37/41 are pre-existing on main and unrelated to this bundle — not a coverage gap for this review.
- **Test-file hygiene (non-blocking observation)**: image-gallery FC tests were promoted to AC-named files (AC-736..740) but the original `test_UAT_FC_REQ-41_*` files were not deleted, and BUG-11/REQ-37/REQ-41-howto tests remain FC-named rather than AC-renamed. This duplication/inconsistent-promotion is a hygiene matter for structural validation / cleanup, not a story-coverage defect — every AC still has exactly one or more passing covering UAT. Does not affect the verdict.

## Verdict

PASS: Stories faithfully represent the operator's stated intent across all six source tickets and accurately document what the 11 commits implement. Documented deviations are captured rather than silently absorbed; no story claims invented behavior; all 7 plan items produced output; and every active AC introduced by this bundle has a passing UAT that enters a real interface and distinguishes a correct implementation from a broken one. A developer reading these stories would have an accurate picture of what the operator intended to build.
