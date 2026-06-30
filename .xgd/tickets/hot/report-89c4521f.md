---
uid: report-89c4521f
id: REPORT-859
type: report
title: 'Reconciliation Review: commits (BUNDLE-8)'
created_by: xgd
created_at: '2026-06-30T01:57:57.544111+00:00'
updated_at: '2026-06-30T01:57:57.544111+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-30021526
  anchor_uid: bundle-30021526
---

# Reconciliation Review: Story Coverage

**Result**: FAIL
**Mode**: commits
**Surface**: (n/a — commit bundle)
**Anchor**: bundle-30021526 (BUNDLE-8 — REQ-44 + REQ-46 + BUG-13 + REQ-49)
**Stories Reviewed**: 5 (STORY-42, STORY-68, STORY-55, STORY-57, STORY-58)

## Summary

The stories themselves are **faithful to intent and complete** — coverage and
fidelity (this review's first job) PASS. Every behaviour the four bundled intents
declare is documented, and the stories explicitly *flag* their code/intent
divergences rather than silently absorbing them (SSR image-style class defect,
`XGD_BIN` default-value drift, FE-applied clear, escalation-heuristic ground-truth,
imagery/assetInventory split, `screenshotUrl` as a presentation-only field). No
invented behaviour, no silent divergence absorption, no missing plan items.

The FAIL is on **Step 5b (evidence sufficiency)**: STORY-42's active AC-432 has a
covering UAT that contradicts the reconciled AC and **fails deterministically** against
the shipped v2 implementation. The reconcile updated the AC text (and added the new
v2 UATs) but left the pre-existing AC-named cardinality test encoding the superseded
v1 contract.

## Behavior Inventory

29 behaviours identified across the 5 plan items (services-grid v2; xgd_ticket dev
tool + sidecar; static external-stylesheet backgrounds; rendered-fetch fonts + bounding
boxes; transcribe force-rendered + screenshotUrl). All are documented by a story — see
Coverage Map. Coverage/fidelity is not the problem; evidence is.

## Coverage Map (story-level — all behaviours covered)

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | services-grid v2: one-col variant, image/heading item fields (asset-ref-only), imageStyle dial, 1..6 bounds, v2 registration | Covered | story-f1e061ba | Story body fully documents v2 upgrade |
| 2 | services-grid SSR string-renderer image-style class mismatch | Covered (noted divergence) | story-f1e061ba | Flagged as code defect, not encoded as AC — correct handling |
| 3 | convert-flow LLM-context services-grid item-shape + imageStyle bullet | Covered | story-f1e061ba | AC-778; canonical owner REQ-44 noted |
| 4 | xgd_ticket dev tool: allowlist {create,list,get}, argv build, no shell pass-through | Covered | story-d44dfd7c | AC-779..787 |
| 5 | sidecar 127.0.0.1, cwd path-segment guard, injected spawner, fail-closed | Covered | story-d44dfd7c | XGD_BIN default-drift flagged for regression |
| 6 | DEV_TOOLS_ENABLED visibility gate + defence-in-depth re-check | Covered | story-d44dfd7c | |
| 7 | static path fetches external stylesheets → kind=background assets (dedup, @media, stylesheet-relative url(), data: filtered, no @import) | Covered | story-3f73931a | AC-788; distinct from rendered AC-613 |
| 8 | rendered fetch @font-face URLs → kind=font assets | Covered | story-3f73931a | AC-789; 'font' AssetKind |
| 9 | rendered fetch hero/nav/section/card bounding boxes → layout.boundingBoxes | Covered | story-3f73931a | AC-790 |
| 10 | transcribe_site force-upgrades static-cached digest to rendered + write-back, best-effort | Covered | story-b3866352 | AC-791 |
| 11 | per-page screenshotUrl = /assets/<screenshotKey> on TranscriptionDigest contract | Covered | story-f45a5e61 | Documented as presentation-only field |

## Ungrounded Stories

None. No story claims behaviour unsupported by intent or code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. services-grid v2 (REQ-44) | story-f1e061ba (STORY-42) | OK — upgraded in place |
| 2. xgd_ticket dev tool + sidecar (REQ-46) | story-d44dfd7c (STORY-68, new) | OK — new feature story |
| 3. external-stylesheet backgrounds (BUG-13) | story-3f73931a (STORY-55) | OK — AC-788 added |
| 4. rendered-fetch fonts + bboxes (REQ-49) | story-3f73931a (STORY-55) | OK — AC-789/790 added |
| 5. transcribe force-rendered + screenshotUrl (REQ-49) | story-b3866352 (STORY-57) + story-f45a5e61 (STORY-58) | OK — AC-791 on STORY-57; screenshotUrl on STORY-58 (updated_by includes this bundle). NOTE: STORY-58 was targeted by item 5 but omitted from the review's stories list; it was nonetheless updated, so no plan item was dropped. |

All 5 plan items produced output. No missing plan items.

## Step 5b — Evidence Sufficiency

### FAIL — STORY-42 / AC-432 (definitive, environment-independent)

`tests/test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6.test.ts` is a
**stale v1 UAT that contradicts the reconciled AC-432 and fails deterministically.**

- Reconciled AC-432: *"an `items` array with fewer than 1 entry (an empty array) or
  more than 6 entries is rejected ... A single item is accepted (one-col feature
  callouts allow one item)."* (bounds 1..6)
- Shipped v2 meta (`packages/framework/src/modules/services-grid/meta.ts`): items
  `min: 1, max: 6`, each item requires `heading` (string) and `body` (markdown);
  there is no `title` field.
- The test, however, still encodes the **v1** contract:
  - `const validItem = { title: "X", body: "<p>x</p>" }` — uses the removed `title`
    field (v2 requires `heading`).
  - Asserts a **1-item** array is rejected with a message matching `/at least 2/`
    (line 15) — but v2's bound is min-of-1, so no such violation is produced.
  - Asserts 2/3/6-item arrays of `title`-only items are **accepted** — but v2 rejects
    them for the missing `heading`.
- Result: the test **fails** (`AssertionError: expected undefined to be defined`,
  line 15) against the correct v2 implementation. AC-432 therefore has **no valid
  passing UAT under its own name**, and the one bearing its name asserts the opposite
  of what the AC requires.

The correct v2 cardinality behaviour **is** proven elsewhere and passes —
`tests/test_UAT_FC_REQ-5_services_grid_rejects_item_count_outside_2_to_6.test.ts`
(heading-bearing items; rejects 0 with "at least 1"; rejects 7 with "at most 6";
accepts 1 and 6) and `tests/test_UAT_FC_REQ-44_services_grid_v2_validates_item_fields.test.ts` —
but neither is named `test_UAT_AC432_*`, so AC-432's designated evidence is the failing
stale file.

**Remediation (for fix loop):** Rewrite `test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6.test.ts`
to the v2 contract — mirror the passing `test_UAT_FC_REQ-5` test: use `{ heading, body }`
items, assert 0 items rejected with `/at least 1/`, 7 items rejected with `/at most 6/`,
and 1 + 6 items accepted. Also rename the file `_2_to_6` → `_1_to_6` to remove the
misleading bound. (Alternatively delete the stale AC432 file and rename the already-correct
`test_UAT_FC_REQ-5` test to `test_UAT_AC432_*` so AC-432 has one properly-named passing UAT.)

### PASS — other reviewed stories' active ACs

- STORY-68 (AC-779..787): all 9 covered by AC-named UATs in
  `test_reconciliation_xgd_ticket_dev_tool.test.ts` — all pass, enter through real
  entry points (`visibleToolSpecs`, the `xgd_ticket` action handler, the sidecar with
  an **injected** spawn fn so allowlist/cwd-guard rejections provably never spawn).
  Not source-inspection; behaviourally distinguishing.
- STORY-55 (AC-788/789/790): all pass through the real extractor / merge / injected
  driver/fetcher boundaries; assert observable inventory + layout outcomes.
- STORY-57 (AC-791) and STORY-58 (screenshotUrl): pass
  (`test_UAT_FC_REQ-49_transcribe_site_forces_rendered`, `..._screenshot_url_in_digest`).
- AC-778 (doc content): treated as **acceptable** — the deliverable is the LLM-context
  doc text wired into the AI system prompt; asserting both copies contain the
  services-grid item-shape/imageStyle guidance observes the shipped artifact, not
  implementation source. (Consistent with the AC-774 image-gallery precedent.)

## Observed full-suite failures NOT attributed to this bundle (fix loop: verify in clean env)

A full `vitest run` (970/977 passing) shows **6 additional failures, all routing through
the chat endpoint / `handleChatRequest`**, sharing one symptom — an SSE stream chunk
(`event: done...`) being fed to `JSON.parse`:

- AC-487 (POST /api/chat error status codes)
- AC-585 (chat-history persist/restore)
- AC-605, AC-606 (analyze_page kind-tagged tool_result through chat)
- AC-633, AC-634 (single-/multi-page conversion e2e — STORY-57)

These are **likely a worktree-environment artifact** (stale workspace-dep bundle /
known reconcile-worktree streaming issue), NOT a bundle regression, because:
1. This bundle's only `chat.ts` change (REQ-46, da05c3e/fdf283de) is a single **additive**
   `case "xgd_ticket"` in `summarizeSystemAction` (a switch with a `default`) — it does
   not touch the SSE/streaming format, status codes, or tool-result forwarding; the
   commit recorded "full suite green."
2. The failures are pre-existing ACs from prior bundles, and the failure is selective
   (only the chat-streaming cluster), not a broad worktree break.
3. The symptom (`event: done` not valid JSON) matches a stale-bundle streaming harness,
   not the deterministic logic failure seen in AC-432.

The fix loop should re-run these in a clean environment to confirm; the verdict does
**not** rest on them. AC-633/634 belong to reviewed STORY-57, so if a clean run still
fails them, they become a genuine Step 5b gap for STORY-57 and must be fixed.

## Process note (why this reached review unflagged)

The workflow's own test stage executed **no tests this run**: all four
reconciliation_test reports (REPORT-847/850/853/856) record *"No test files to execute"*,
and the regression report records *"pass (0 tests, 0 failed)"*. With zero UATs executed,
neither the AC-432 contradiction nor the chat-cluster failures were caught by the gate.
The reconcile's test-selection and/or quality stage should be examined so the suite is
actually exercised before the review gate.

## Judgment Calls

- **AC-778 (doc-content assertion) — acceptable, not a source-inspection FAIL.** The
  doc IS the product artifact (wired into the system prompt); asserting its content is
  observing behaviour, not inspecting implementation source.
- **STORY-58 omitted from review stories list — not a dropped plan item.** It was
  updated by this bundle (updated_by + body screenshotUrl AC) and its UAT passes.
- **Chat-endpoint cluster — flagged but not the basis of FAIL.** Honest classification:
  most likely environmental; cannot be confirmed as a bundle regression given the
  innocuous additive chat.ts diff.
- **AC-432 — material FAIL.** A developer reading AC-432 and trusting its named UAT
  would be actively misled: the UAT proves the opposite (1-item rejected, v1 `title`)
  of the reconciled AC (1-item accepted, v2 `heading`), and it does not pass.

## Verdict

**FAIL.** Story-level coverage and intent fidelity are sound, but Step 5b evidence
sufficiency fails: STORY-42's active AC-432 is backed by a stale v1 UAT
(`test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6.test.ts`) that
contradicts the reconciled AC and fails deterministically against the shipped v2
`services-grid` implementation. The fix loop must migrate that UAT to the v2 contract
(1..6 bounds, `heading`-bearing items) as detailed above. Separately, it should verify
the 6 chat-endpoint suite failures (AC-487/585/605/606/633/634) in a clean environment
and confirm the reconcile test/quality stage actually executes the UAT suite.
