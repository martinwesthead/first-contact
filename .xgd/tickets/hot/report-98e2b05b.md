---
uid: report-98e2b05b
id: REPORT-715
type: report
title: 'UAT Coverage: Framework Theme Tokens & CSS Generation'
created_by: xgd
created_at: '2026-06-28T21:25:34.591165+00:00'
updated_at: '2026-06-28T21:25:34.591165+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-c64bb7c7
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Framework Theme Tokens & CSS Generation

**Result**: PASS
**AC verdicts**: 8 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 1 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

Chronological ledger of intents that touched this capability:

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6, carries REQ-4) | free_and_reconciled (merged @ 8ebe122e) | 2026-06-25 | Added the framework theme surface: token→CSS `:root` generation, published default-token set, optional dark-palette `@media` override, and the vetted 13-font Google Fonts shortlist + resolver + URL helpers | YES |

Single reconciled intent; no later intent retires or modifies any behavior. The full current cumulative intent for this capability is exactly what STORY-40 describes — all behaviors active.

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-40 (story-e53ba4cf) | BUNDLE-2 / REQ-4 | aligned | Story body enumerates the variable-name contract, defaults, dark-mode block, and 13-font shortlist — every clause supported by the reconciled bundle; nothing retired. |

## Findings — Categorized by Editor Action

No findings. All 8 ACs are active per cumulative intent and each is substantively covered by a real-entry-point UAT. The story body is fully aligned and its behavioral promise is collectively proven by the test set.

## AC → Test Evidence Map

| AC | Behavior | Test (real entry point) | Verdict |
|---|---|---|---|
| AC-403 | `:root` block has a CSS custom property for every locked slot, deterministically kebab-named | `test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot` — calls real `generateThemeCss`, asserts every palette/typography/scale/weight/lineHeight/spacing/radius/shadow/container/breakpoint variable | pass |
| AC-404 | Supplied values appear verbatim on the RHS | `test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties` — overrides primary/spacing/heading, asserts exact emitted values | pass |
| AC-405 | Partial input fills unspecified slots from defaults without dropping siblings | `test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults` — partial palette + partial spacing, asserts overrides applied and sibling defaults retained | pass |
| AC-406 | No input → fully-defaulted neutral stylesheet with system fonts | `test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet` — `generateThemeCss()` with no args, asserts every default value + light-palette/system-font properties | pass |
| AC-407 | Dark palette adds `prefers-color-scheme:dark` block overriding only supplied roles | `test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles` — isolates `@media` block, asserts exact set of overridden props and absence of others; also asserts no block when dark omitted | pass |
| AC-408 | Vetted shortlist of 13 fonts, each with stable metadata | `test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata` — asserts length 13, exact family set, per-spec id/family/googleFamily/weights/category, `+`-encoding | pass |
| AC-409 | font-family declaration resolves case-insensitively, ignoring quotes | `test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes` — real `findFontByFamilyDeclaration` across quote/case/multi-word/miss cases | pass |
| AC-410 | Font specs → Google Fonts CSS2 URL with weights + display=swap | `test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap` — real `googleFontsHref`, asserts URL shape, order preservation, single `display=swap`, empty→undefined | pass |

Behaviors 1–3 are additionally covered by the `test_UAT_FC_REQ-4_generate_css_*` UATs (root properties, default substitution, dark-mode block), and the downstream font-preload path by `test_UAT_FC_REQ-6_generator_preloads_configured_fonts`.

## Notes for the Editor

No edits required. Evidence quality is high: every UAT invokes the real `@1stcontact/framework` exports and asserts on the emitted CSS string / returned spec / built URL — none are structural (no source-text scraping) and none mock the unit under test. Test fixtures (`makeThemeTokens`) supply input data only; the functions under test are real. The capability is clean.
