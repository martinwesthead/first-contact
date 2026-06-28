---
uid: report-0d7fbf29
id: REPORT-723
type: report
title: 'UAT Coverage: Site Definition Schema'
created_by: xgd
created_at: '2026-06-28T21:39:22.315901+00:00'
updated_at: '2026-06-28T21:39:22.315901+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-b7eebd2b
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Site Definition Schema

**Result**: PASS
**AC verdicts**: 12 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 1 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

This capability is reconciled from a single bundle. No behavior has been
retired; the story body is documented as the post-bundle steady state.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (REQ-1..REQ-8) | free_and_reconciled | 2026-06-25 (commit 8ebe122e) | REQ-3 introduced the site-schema package (types + `validateSite`); REQ-4 widened `ThemeTokens` to the locked 55-token superset (palette→9 roles, scale→9 steps + weights + lineHeights, spacing→10 geometric steps, container→4 slots, `fg`→`text`); REQ-6 widened `ContentValue` to admit plain objects | YES |

The contract evolves exactly once across the bundle and reaches a stable
shape. Intermediate mid-bundle shapes are intentionally not captured (per
the story's Technical Context).

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-39 | BUNDLE-2 (REQ-3, REQ-4, REQ-6) | aligned | Story body describes exactly the post-bundle steady state. Every behavioral promise — full hierarchy types, locked token superset, recursive `ContentValue`, `validateSite` Result discriminated union, all six structural rules, and the catalog-membership boundary — is supported by reconciled intent and proven by tests. No stale claims. |

## Findings — Categorized by Editor Action

No findings. All 12 ACs are active per cumulative intent and substantively
covered; the story body is aligned and fully covered.

## Evidence Notes

- All 12 ACs (AC-391..AC-402) have dedicated UATs named
  `test_UAT_AC<n>_*.test.ts`, each invoking the real `validateSite()`
  entry point against real fixtures (`makeMinimalSite`, `makeFullSite`,
  `makeThemeTokens`). No internal mocking; assertions distinguish correct
  from incorrect implementations (success/failure branch, exact
  JSON-pointer paths, type narrowing via `expectTypeOf`).
- Coverage map:
  - AC-391 minimal-site success + `Site` narrowing — `test_UAT_AC391_*`
  - AC-392 full-site every-slot success (incl. all 3 nav target kinds,
    variant/dials/content, assets) — `test_UAT_AC392_*`
  - AC-393 missing module field → JSON-pointer (parameterized type/version/id)
    — `test_UAT_AC393_*`
  - AC-394 nav pattern enum (negative + all 5 positive) — `test_UAT_AC394_*`
  - AC-395 missing theme-token slot (7 groups parameterized) — `test_UAT_AC395_*`
  - AC-396 non-hex palette value (6 bad formats) — `test_UAT_AC396_*`
  - AC-397 catalog membership NOT validated (unknown type/variant/dial) —
    `test_UAT_AC397_*`
  - AC-398 ValidationError list shape + JSON-pointer paths — `test_UAT_AC398_*`
  - AC-399 locked superset accepted (every slot asserted present) —
    `test_UAT_AC399_*`
  - AC-400 ContentValue admits primitives/AssetRef/arrays/plain objects —
    `test_UAT_AC400_*`
  - AC-401 duplicate module ids rejected at `/pages/0/modules/1/id` —
    `test_UAT_AC401_*`
  - AC-402 duplicate page slugs rejected at `/pages/1/slug` — `test_UAT_AC402_*`
- All 12 UATs execute green (`vitest run`, 13ms aggregate).

## Notes for the Editor

Nothing to edit. This capability is a clean, fully-reconciled,
fully-covered contract. The 1:1 AC→UAT mapping plus the full-site fixture
provides redundant coverage of the type hierarchy. No deprecation, no
story-body drift, no coverage gaps.
