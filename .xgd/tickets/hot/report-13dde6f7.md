---
uid: report-13dde6f7
id: REPORT-710
type: report
title: 'Capability-Intent Alignment: Framework Theme Tokens & CSS Generation (level=uat)'
created_by: xgd
created_at: '2026-06-28T21:21:00.806278+00:00'
updated_at: '2026-06-28T21:21:00.806278+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-c64bb7c7
  level: uat
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Framework Theme Tokens & CSS Generation
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

UAT-level check: ACs (AC-403–AC-410 under STORY-40) are the working
reference; intent consulted only where an AC appeared suspicious (none did).

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (REQ-1..REQ-5 +3) | free_and_reconciled | 2026-06-25 | Reconciled bundle that established STORY-40 (feature) and its AC tree; REQ-3 is the originating intent for the theme-token surface | YES |

STORY-40 (story-e53ba4cf, story_kind=feature, status=reconciling — imminent)
is the sole story under CAP-33. Its 8 ACs are all active behavior criteria.

## Alignment Ledger

Each AC's UAT (test file `tests/test_reconciliation_theme_css_and_fonts.test.ts`)
maps 1:1 to its AC and exercises the real `@1stcontact/framework` entry points
(`generateThemeCss`, `findFontByFamilyDeclaration`, `googleFontsHref`,
`VETTED_FONTS`, `defaultThemeTokens`) — no internal mocking.

| Element (AC → UAT) | Exercises AC behavior? | Outcome |
|---|---|---|
| AC-403 → test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot | Asserts `:root` block + all 55 enumerated custom-property names (9 palette, 2 family, 9 size, 5 weight, 3 line-height, 10 space, 5 radius, 4 shadow, 4 container, 4 breakpoint); checks kebab-casing of surface-subtle/surface-inverse | aligned |
| AC-404 → test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties | Sets distinctive primary/space-4/font-family-heading values, asserts each appears verbatim on the property RHS | aligned |
| AC-405 → test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults | Partial palette + partial spacing inputs; asserts overridden slot + sibling defaults from `defaultThemeTokens` | aligned |
| AC-406 → test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet | No-arg invocation; asserts every slot at published default, light-neutral palette (bg #ffffff, light surface, dark text), system-ui families | aligned |
| AC-407 → test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles | Dark palette of 3 roles; isolates `@media (prefers-color-scheme: dark)` block, asserts exactly those 3 color props and no others; asserts no media block when dark absent | aligned |
| AC-408 → test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata | Asserts exactly the 13 named families, per-entry id/family/googleFamily/weights/category metadata, '+'-encoding spot-checks (Playfair+Display display, Work+Sans body) | aligned |
| AC-409 → test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes | Resolves quoted/double-quoted/unquoted/mixed-case/multi-word primary family; asserts undefined (no throw) for off-shortlist family | aligned |
| AC-410 → test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap | Single + multiple specs (order preserved), CSS2 base, `family=<enc>:wght@<;-joined>`, single `display=swap`; empty list → undefined | aligned |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | coverage | AC-403..AC-410 | — | All 8 active ACs have exactly one substantive UAT exercising real entry points (no AST-only/structural checks, no internal mocking) | none |
| 2 | info | exclusivity | UAT suite | — | One test per AC, distinct scenarios, single test file — no redundant same-shape duplicates | none |
| 3 | info | consistency | test file name | — | File `tests/test_reconciliation_theme_css_and_fonts.test.ts` and its `describe` label read as "reconciliation"/story-level, but STORY-40 is `story_kind=feature` and these are genuine feature UATs. Cosmetic only — does not affect AC↔UAT alignment or pass/fail | optional: rename file to drop "reconciliation" for clarity |

## Notes for the Editor

No drift at the UAT level. Every active AC under CAP-33 is covered by exactly
one substantive UAT that invokes the real framework theme surface and asserts
the behavior its AC's Verification section prescribes. The only observation is
the cosmetic "reconciliation" naming on the test file (finding #3), which is
not an alignment violation. PASS.
