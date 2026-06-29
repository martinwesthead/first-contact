---
uid: report-512618da
id: REPORT-768
type: report
title: 'Reconciliation Review: BUNDLE-5 (commits)'
created_by: xgd
created_at: '2026-06-29T00:32:06.717435+00:00'
updated_at: '2026-06-29T00:32:06.717435+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-d4ce3987
  anchor_uid: bundle-d4ce3987
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: (n/a — commits/bundle mode)
**Anchor**: bundle-d4ce3987 (BUNDLE-5)
**Stories Reviewed**: 7 (story-ba9f2715 carries plan items 1 & 2)

## Method

Intent read first (bundle body + per-ticket sections + comments), then code, then
stories. Evidence sufficiency (Step 5b) verified by reading every bundle UAT and the
production code it exercises, and by running the full bundle UAT set: **97 tests across
31 files, all passing** (`vitest run`, 2.8s).

## Behavior Inventory (net end-state)

Ten source tickets; BUG-4 is a net no-op (its confirmation-card wiring was deleted by
REQ-35) and BUG-10 landed only issue 1 (issue 2 explicitly deferred). Net behaviors:

1. REQ-32 — chat panel in-flight send-blocking (disabled + CSS spinner + aria-busy; repeat click/Cmd+Enter suppressed; editor stays editable; reset on resolve AND reject).
2. BUG-3 — renderer `target:'preview'|'production'` (production byte-unchanged); preview emits `#/<pageId>`; iframe hashchange re-renders in-document; in-page anchors don't switch; unknown pageId -> first page.
3. BUG-7 — `build-builder-bundle.mjs --watch` (esbuild watch, logs "Watching"); dev script runs watcher + wrangler concurrently; one-shot still exits 0 + writes bundle.
4. REQ-33 — markdown content union (string | text AssetRef); AssetRef `kind:image|text` discriminator; renderer HTML-sniff + markdown->HTML + resolver w/ alt fallback; `htmlToMarkdown` capture + image-ref rewrite; transcribe Stage 5 writes copy/*.md + digest copy/inlineMarkdown; `write_text_asset` key-guarded R2 write; tools/generate bakes static HTML (no runtime fetch).
5. REQ-35 — confirmation gate removed (no requires_confirmation, no confirm_convert action, no convertConfirmed; robotsOverrides retained).
6. REQ-34 — Stage 0 clear-to-empty-scaffold (default theme, no modules, businessName from source title else 'Untitled'); unconditional; cleared definition applied to server workingSite + FE store; stage 0 'cleared' SSE before digest.
7. BUG-10 (issue 1 only) — bootBuilder registers `registerTranscribeProgress()` so `transcribe_site_done` routes to the multi-stage card; Stage 0 'Clearing draft' row (5 rows 0..4).
8. BUG-5 — digest assetInventory entries carry precomputed image `assetRef {id,src,alt}`; how-to instructs AssetRef object for image fields.
9. REQ-14 — `set_nav_pattern`, `set_nav_entries`, `set_page_metadata` (id-stable rename), `duplicate_module`; `Site.superRefine` nav cross-ref validation; how-to/system-prompt exposure.

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | REQ-32 send-blocking | Covered | story-ba9f2715 | Story documents panel-local `busy` flag, aria-busy, reset-on-settle. |
| 2 | BUG-3 preview multi-page nav | Covered | story-ba9f2715 | `target` option + `#/<pageId>` + hashchange re-render documented. |
| 3 | BUG-7 dev watch rebuild | Covered | story-067dc2f8 | `--watch` + concurrently dev wiring documented. |
| 4 | REQ-33 markdown content + capture | Covered | story-ddc928fd | New story; all 14-AC surface documented incl. static-bake + write_text_asset; high-risk areas flagged for regression. |
| 5 | REQ-35 gate removal | Covered | story-b3866352 | "immediately, with no confirmation prompt"; superseded ACs removed. |
| 5 | REQ-34 clear-to-scaffold | Covered | story-b3866352 | Unconditional clear, businessName/Untitled, FE+server mirror documented. |
| 6 | REQ-34/35 chat cards | Covered | story-2524a1ae | Boot-registered progress card + Stage 0 row; ConvertConfirmation removal documented (not absorbed). |
| 7 | BUG-5 image assetRef | Covered | story-f45a5e61 | Precomputed assetRef in digest + how-to image instruction documented. |
| 8 | REQ-14 nav/page/duplicate tools | Covered | story-e893e643 | All four tools + id-stable rename + superRefine cross-ref documented. |
| — | BUG-4 confirmation wiring | Net-removed | story-2524a1ae | Correctly no plan item; removal documented, x-session-id noted as latent infra. |
| — | BUG-10 issue 2 (populated iframe) | Correctly out-of-scope | — | Deferred per intent; no story over-claims a populated-iframe behavior. |

## Intent Fidelity

- **BUG-4 supersession handled faithfully.** No story claims a live ConvertConfirmation card. story-2524a1ae explicitly documents the card's removal and flags the residual stale `<ChatCard>` doc-comment — a flagged divergence, not silent absorption.
- **BUG-10 issue-2 deferral respected.** story-2524a1ae scopes to issue 1 (registerTranscribeProgress wiring + Stage 0 row) only. No story asserts the blank-iframe/module-ID fix, matching the intent's explicit deferral.
- **Divergences flagged, not absorbed:** `transcribe_progress` -> `transcribe_site_done` registration key (story-2524a1ae); React -> vanilla DOM (story-ba9f2715); digest-key notes (story-f45a5e61).

## Ungrounded Stories

None. Every story is grounded in both intent and code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. Builder UI — chat panel (REQ-32) | story-ba9f2715 | ✓ |
| 2. Builder UI — live preview (BUG-3) | story-ba9f2715 | ✓ |
| 3. Deploy/build pipeline (BUG-7) | story-067dc2f8 | ✓ |
| 4. Framework — markdown content (REQ-33) | story-ddc928fd (new) | ✓ |
| 5. Convert flow — orchestration (REQ-34/35) | story-b3866352 | ✓ |
| 6. Convert flow — chat cards (REQ-34/35/BUG-10) | story-2524a1ae | ✓ |
| 7. Convert flow — transcription digest (BUG-5) | story-f45a5e61 | ✓ |
| 8. AI tool surface (REQ-14) | story-e893e643 | ✓ |

All 8 plan items produced output. None dropped.

## Evidence Sufficiency (Step 5b)

All bundle UATs pass (97/97). Every behavioral UAT enters through a real production
interface (createChatPanel, renderSiteToHtml/renderSiteIntoIframe, the real
build-builder-bundle.mjs subprocess, validateModuleContent/Site.superRefine, the real
transcribeSiteHandler via harness, real applyToolCall/findAction registry, bootBuilder
+ the live RENDERERS map). Only external seams are stubbed (globalThis.fetch / Anthropic,
in-memory KV/R2). No repository-owned internal component is mocked.

Two specifically-targeted risks were cleared:
- **BUG-10 wiring test is NOT source-inspection** — it clears the renderer registry, runs bootBuilder, and asserts `transcribe_site_done` now resolves via the live `Map.get`, so it proves the function is wired into dispatch, not merely that a name exists.
- **REQ-35 no-gate test invokes the real handler** and asserts progression to Stage 1 with no `convert_confirmation_required` event; registry-enumeration is supplementary, not the sole proof.

## Judgment Calls (non-blocking observations)

These are WEAK-grade evidence notes that do NOT change the verdict; logged for the
matrix/regression backlog:

- **duplicate_module "refs by reference" claim is untested (internal detail).** The AC/story say asset refs are duplicated by reference; the implementation uses `structuredClone`, which deep-copies the ref object. No fixture module carries an AssetRef, so no test distinguishes the two. This is an internal implementation detail with **no user-visible difference** (the clone still points at the same R2 key; no asset is copied) — acceptable per the materiality test. A future regression UAT could add an AssetRef-bearing module and assert referential identity if the by-reference contract is ever load-bearing.
- **REQ-32 `builder_html_ships_spinner_css` is a source-inspection (asset-text) test** — acceptable as supplementary: the behavioral aria-busy/disabled toggle is proven by the sibling runtime tests.
- **BUG-5 `doc_states_assetref_format` is a doc-content assertion** — legitimate verification mode for a documentation AC; the runtime counterpart (image actually renders) is covered by `image_renders_in_preview`.

## Verdict

**PASS.** The stories faithfully represent the operator's stated intent — including the
two subtle net-state cases (BUG-4 superseded to a no-op, BUG-10 issue-2 deferred) — and
flag intent/code divergences rather than absorbing them silently. All significant
behaviors within the bundle's declared scope are covered, no story describes invented
behavior, all 8 plan items produced output, and every active AC is backed by a passing
UAT that enters through a real interface and would fail if the behavior were removed. A
developer reading these stories would have an accurate mental model of what BUNDLE-5
intended to build and what it actually does.
