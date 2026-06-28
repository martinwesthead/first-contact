---
uid: report-674fd3b2
id: REPORT-720
type: report
title: 'Capability-Intent Alignment: Site Definition Schema (level=uat)'
created_by: xgd
created_at: '2026-06-28T21:35:37.812539+00:00'
updated_at: '2026-06-28T21:35:37.812539+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-b7eebd2b
  level: uat
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Site Definition Schema
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

At uat level the AC bodies are the working reference (story and ac
layers assumed aligned, having run first). AC bodies are empty —
their titles serve as the criteria. Each AC was checked against its
`test_UAT_AC<n>_*` test for substantive coverage of the claimed
behavior.

## Cumulative Intent Considered

The capability's single story (STORY-39, story_kind=feature,
status=reconciling) carries `intent_uid=bundle-94e1d1b6`.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged @8ebe122e | Bundles REQ-1..REQ-8; schema-relevant: REQ-3/4/6 | YES |
| └ REQ-3 | (in reconciled bundle) | — | Initial typed schema + validateSite + structural rules | YES |
| └ REQ-4 | (in reconciled bundle) | — | Widened ThemeTokens to locked superset (9-role palette, 9-step scale + weights + lineHeights, 10-step spacing, 4-slot container) | YES |
| └ REQ-6 | (in reconciled bundle) | — | Widened ContentValue to admit plain objects | YES |

No retired/abandoned intent touches this capability. The story's
Technical Context explicitly documents the post-bundle steady-state
shape; mid-bundle intermediate shapes are intentionally not in the
matrix. The 12 ACs reflect that steady state.

## Alignment Ledger

| Element (test) | AC | Intents aligned to | Outcome |
|---|---|---|---|
| test_UAT_AC391 | AC-391 valid minimal narrows to Site | REQ-3 | aligned — calls validateSite(makeMinimalSite()), asserts ok + compile-time narrowing |
| test_UAT_AC392 | AC-392 valid full site every slot | REQ-3/4/6 | aligned — full fixture exercises all nav kinds, variant/dials/content, assets |
| test_UAT_AC393 | AC-393 module missing field rejected | REQ-3 | aligned — deletes type/version/id, asserts JSON-pointer paths |
| test_UAT_AC394 | AC-394 nav pattern outside enum | REQ-3 | aligned — negative + positive sweep over all 5 patterns |
| test_UAT_AC395 | AC-395 missing theme slot rejected | REQ-3/4 | aligned — 7 slot deletions, asserts exact pointer path |
| test_UAT_AC396 | AC-396 non-hex palette value | REQ-3 | aligned — 6 bad color values, asserts /theme/palette/primary |
| test_UAT_AC397 | AC-397 catalog membership NOT validated | REQ-3 | aligned — fake type/variant/dial all accepted |
| test_UAT_AC398 | AC-398 ValidationError list w/ pointers | REQ-3 | aligned — asserts ValidationError[] shape + pointer invariant |
| test_UAT_AC399 | AC-399 locked superset enforced | REQ-4 | aligned — full superset validates; every slot asserted present (rejection path covered by AC-395) |
| test_UAT_AC400 | AC-400 ContentValue admits objects | REQ-6 | aligned — primitives, AssetRef, arrays, nested objects, array-of-objects |
| test_UAT_AC401 | AC-401 duplicate module IDs | REQ-3 | aligned — asserts /pages/0/modules/1/id + /duplicate/i |
| test_UAT_AC402 | AC-402 duplicate page slugs | REQ-3 | aligned — asserts /pages/1/slug + /duplicate/i |

All 12 active ACs have exactly one substantive UAT that drives the
real `validateSite` entry point (no AST/structural-only checks; no
internal mocking — `_fixtures_REQ-3_site.ts` is test data, not a
component mock). Coverage and consistency are fully satisfied.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | exclusivity | test_UAT_FC_REQ-3_* (8 tests) vs test_UAT_AC39x | uat-edit (remove duplicates) | The 8 free-coded `test_UAT_FC_REQ-3_*` tests verify the same scenarios in the same shape (vitest, same `_fixtures_REQ-3_site` helpers, same `validateSite` calls) as the AC-mapped UATs: FC valid_minimal_site_validates ≈ AC-391; FC validator_returns_typed_site ≈ AC-391/AC-398; FC valid_full_site_validates ≈ AC-392; FC invalid_module_instance_shape_rejected ≈ AC-393; FC invalid_nav_pattern_rejected ≈ AC-394; FC theme_tokens_missing_slot_rejected ≈ AC-395; FC invalid_color_format_rejected ≈ AC-396; FC catalog_membership_not_validated ≈ AC-397. They trace to the free-coded REQ-3 evidence rather than to a matrix AC. | Retire the `test_UAT_FC_REQ-3_*` set now that AC-mapped UATs are the matrix evidence; the AC UATs are strictly broader (parameterized sweeps, pointer-path assertions). Opportunistic — does not affect pass/fail. |

## Notes for the Editor

- Pure cleanup opportunity, not drift: the matrix↔intent alignment
  is sound. The FC_REQ-3 tests are the original free-coded evidence
  superseded by the reconciliation UATs (AC-391..AC-402). The AC
  set is a strict superset of behavior (e.g. AC-394 sweeps all five
  nav patterns where the FC version checks one; AC-393/395/396
  assert exact JSON-pointer paths where the FC versions only assert
  rejection). Removing the FC duplicates reduces redundant suite
  runtime with no coverage loss.
- AC-399 ("enforces the locked superset") is verified positively
  (full superset validates + every slot present on the typed
  value); the rejection half of "enforces" is carried by AC-395
  (missing-slot rejection with pointer path). Together they fully
  exercise the AC — recorded here so a future check does not
  mistake AC-399's positive-only test for a gap.
