---
uid: report-3e384d15
id: REPORT-862
type: report
title: 'Reconciliation Review: commits (BUNDLE-8)'
created_by: xgd
created_at: '2026-06-30T03:16:25.917347+00:00'
updated_at: '2026-06-30T03:16:25.917347+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-30021526
  anchor_uid: bundle-30021526
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: (n/a — commits bundle)
**Anchor**: bundle-30021526
**Stories Reviewed**: 6 (story-f1e061ba/STORY-42, story-d44dfd7c/STORY-68, story-3f73931a/STORY-55 [items 3+4], story-b3866352/STORY-57, story-f45a5e61/STORY-58 — STORY-58 reviewed as the second target of plan item 5)

## Behavior Inventory

18 behaviors across 5 free-coded intents (REQ-44, REQ-46, BUG-13, REQ-49). 8 content commits + 3 no-behaviour version bumps. Code, UATs, and story bodies independently read.

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | services-grid one-col variant (single full-width feature-callout card, narrow container) | Covered | story-f1e061ba | Story body + AC; UAT one_col_renders_single_card passes |
| 2 | item fields icon->image (asset-ref only, no string fallback), title->heading | Covered | story-f1e061ba | UAT v2_validates_item_fields passes (rejects string image, missing heading) |
| 3 | imageStyle dial icon|cover|thumb -> image-style class | Covered | story-f1e061ba | UAT renders_item_image_and_image_style_dial passes |
| 4 | item count bounds 2..6 -> 1..6 (AC-432 modified) | Covered | story-f1e061ba | Story records the knowing AC-432 change |
| 5 | services-grid resolves at v2 in registry | Covered | story-f1e061ba | UAT v2_registered passes |
| 6 | convert-flow LLM-context doc + mirror gain services-grid item-shape + imageStyle bullet | Covered | story-f1e061ba | Canonical owner REQ-44 recorded |
| 7 | SSR string-renderer image-style class mismatch (fc-services-grid--image-style-X) | Covered (flagged) | story-f1e061ba | Documented as code defect, NOT an AC — correct (divergence noted, not absorbed) |
| 8 | xgd_ticket dev tool: allowlist {create,list,get}, argv build, no shell pass-through | Covered | story-d44dfd7c | UATs rejects_unknown_command / create_routes_to_sidecar pass |
| 9 | localhost sidecar HTTP contract; cwd guard by path-segment (not prefix-substring) | Covered | story-d44dfd7c | UATs sidecar_refuses_command / refuses_cwd pass |
| 10 | dev-only visibility gate (DEV_TOOLS_ENABLED) + defence-in-depth handler re-check | Covered | story-d44dfd7c | UATs invisible_in_prod / visible_when_dev_enabled / handler flag re-check pass |
| 11 | structured success/failure surfacing (ok/stdout/stderr/exitCode; non-2xx -> failed) | Covered | story-d44dfd7c | UAT propagates_sidecar_failure passes |
| 12 | XGD_BIN default drift (.venv-working vs .venv-xgendev-main) | Covered (flagged) | story-d44dfd7c | Documented as default-value drift for regression — correct |
| 13 | static-path external-stylesheet background discovery (link rel=stylesheet, @media, dedup, data: filtered, no @import) | Covered | story-3f73931a | UAT BUG-13 external_stylesheet_backgrounds (8 tests) passes; disambiguated from rendered AC-613 |
| 14 | rendered @font-face -> kind=font asset records (dedup-by-URL, family on record) | Covered | story-3f73931a | UAT font_face_urls_captured passes |
| 15 | rendered hero/nav/section/card bounding boxes -> layout.boundingBoxes | Covered | story-3f73931a | UAT bounding_boxes_captured passes; existing layout fields preserved |
| 16 | schema adds 'font' AssetKind + BoundingBox/LayoutBoundingBoxes | Covered | story-3f73931a | In-scope schema item documented |
| 17 | transcribe_site force-upgrades static-cached digest to rendered, writes back to FETCH_CACHE_KV, best-effort fallback + notify | Covered | story-b3866352 | UAT transcribe_site_forces_rendered passes (asserts KV rewrite to fetchPath='rendered', merged signals, notify) |
| 18 | per-page screenshotUrl = /assets/<screenshotKey> (empty when no key) | Covered | story-f45a5e61 | UAT screenshot_url_in_digest passes (populated + empty branches) |

All 18 behaviors Covered. No Partial, no Uncovered.

## Ungrounded Stories

None. No story claims behaviour unsupported by code or intent. The stories' notable property is the reverse of absorption: three code↔intent divergences are explicitly surfaced (rows 7, 12, and STORY-57's FE-applied-clear / digest-lookup-source notes) rather than silently documented as correct.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. services-grid v2 (upgrade) | story-f1e061ba (STORY-42) | OK |
| 2. xgd_ticket dev tool + sidecar (feature) | story-d44dfd7c (STORY-68, new) | OK |
| 3. external-stylesheet backgrounds (upgrade) | story-3f73931a (STORY-55) | OK |
| 4. rendered-fetch fonts + bboxes (upgrade) | story-3f73931a (STORY-55) | OK |
| 5. transcribe force-rendered + screenshotUrl (upgrade) | story-b3866352 (STORY-57) + story-f45a5e61 (STORY-58) | OK — both updated_by bundle-30021526 |

No plan items dropped. STORY-58 is the second target of item 5; though not in the explicit review-list string, it carries the screenshotUrl AC and was updated by this bundle — accounted for.

## Evidence Sufficiency (Step 5b)

16 FREE-CODING UAT files, 58 assertions, executed locally: ALL PASS (REQ-44 4 files/17, BUG-13 1 file/8, REQ-46 7 files/28, REQ-49 4 files/5). Spot-checked the highest-risk UATs for evidence validity:
- screenshot_url_in_digest: real buildTranscriptionDigest, asserts both populated and empty branches — not a tautology.
- xgd_ticket_rejects_unknown_command: enters via real findAction('xgd_ticket') dispatch + real handler; asserts failed status, allowlist-naming error, and fetch never called (no sidecar contact); plus the DEV_TOOLS_ENABLED fail-closed re-check.
- transcribe_site_forces_rendered: mocks only the injectable BrowserDriver (documented external boundary); runs the real transcribe harness; asserts KV write-back to fetchPath='rendered', merged computed typography, screenshotUrl derivation, and the upgrade notify event. A broken impl skipping the upgrade would fail it.
None rely on internal mocking or source-text inspection.

Note (not a blocker, structural-validation scope): the per-story reconciliation_test reports (REPORT-843/847/850/853/856) read "No test files to execute" because the reconcile test-selector keys on test_UAT_AC{N}_* names while the evidence ships under the test_UAT_FC_* free-coding names. That is an AC<->test linkage/selection concern owned by structural validation, not story-level intent fidelity. The behavioural evidence itself exists and passes (verified by direct execution).

## Judgment Calls

- Three version-bump commits carry no behaviour — correctly excluded; not a coverage gap.
- SSR string-renderer image-style class mismatch (row 7) recorded as a code defect rather than an AC — correct handling: the canonical intended behaviour is the Astro/UAT-tested path; the matrix should not encode a defect as desired behaviour, and the divergence is documented for regression.
- XGD_BIN default-path drift (row 12) flagged as default-value drift, env-overridable — immaterial to behaviour; correctly noted, not encoded as an AC.

## Verdict

PASS: Stories accurately and completely document the behaviour surface and faithfully represent the operator's intent across all four bundled requests. Divergences between intent and code are explicitly surfaced rather than silently absorbed. All five plan items produced story output, and every active behaviour is backed by a passing, behaviourally-valid UAT entered through a real interface. A developer reading these stories would have a correct mental model of what this code does.
