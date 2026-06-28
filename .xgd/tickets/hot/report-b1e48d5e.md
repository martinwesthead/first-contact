---
uid: report-b1e48d5e
id: REPORT-680
type: report
title: 'Capability-Intent Alignment: Static Site Generator (level=uat)'
created_by: xgd
created_at: '2026-06-28T20:28:00.808605+00:00'
updated_at: '2026-06-28T20:28:00.808605+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-820fbc22
  level: uat
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Static Site Generator
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

The capability has a single story (STORY-43 / story-d111f966, story_kind=feature)
whose `intent_uid` is BUNDLE-2 (bundle-94e1d1b6). The bundle is the reconciled
free-coded delivery of the Phase-0 generator (originating REQ-6, with the
Turnstile head-emission detail belonging to REQ-7/lead-capture and explicitly
documented as out-of-AC-scope in the story body).

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (REQ-1..REQ-8) | free_and_reconciled | merged @ 8ebe122e | Reconciled the file-backed static site generator (runGenerate + fc-generate CLI): loading/validation, slug-derived HTML5 pages, module anchor wrapping, per-site theme.css, head metadata + Google Fonts, asset copying, --clean, typed failures | YES |

At uat level the AC layer (AC-443..AC-455) is the working reference; intent
history was consulted only to confirm the generator surface is reconciled
(it is: BUNDLE-2 = free_and_reconciled). No retired or imminent intent touches
this capability.

## Alignment Ledger

Every active AC has exactly one substantive UAT in
`tests/test_reconciliation_static_site_generator.test.ts`. Each UAT exercises
real entry points — it spawns the packaged CLI (`tools/generate/bin/cli.mjs`)
as a subprocess and/or calls `runGenerate` programmatically, then inspects the
real files written. No internal component is mocked (thin-mock boundary
respected; the only env manipulation is clearing `TURNSTILE_SITE_KEY` for
deterministic head output).

| AC | UAT (it-name) | Outcome |
|---|---|---|
| AC-443 CLI flags --site/--out/--clean | test_UAT_AC443_cli_accepts_site_out_clean_flags | aligned — real subprocess; exit 0 + summary; missing flags → non-zero + usage |
| AC-444 runGenerate result shape | test_UAT_AC444_runGenerate_returns_result_describing_outputs | aligned — outDir/pagesWritten/cssPath/assetsWritten all asserted against real files |
| AC-445 HTML5 doc at slug-derived path | test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc | aligned — root→index.html, nested→about/index.html, doctype + single head/body |
| AC-446 module anchor wrapper | test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker | aligned — id + data-module-instance co-occur on one element, exactly once each |
| AC-447 theme.css concatenation | test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles | aligned — recognizable --color-primary AND .fc-* selector in same file |
| AC-448 page links theme.css | test_UAT_AC448_every_page_links_to_assets_theme_css | aligned — every page head has stylesheet link href="/assets/theme.css" |
| AC-449 head meta + seoMeta-first fallback | test_UAT_AC449_head_emits_viewport_title_description_og_metadata | aligned (see Finding 1) — covers seoMeta.title and page-title fallback; businessName fallback is unreachable by schema |
| AC-450 Google Fonts links | test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves | aligned — vetted (Manrope+Inter) emits all four links w/ deduped family query; non-vetted emits none |
| AC-451 asset copy preserving paths | test_UAT_AC451_assets_copied_preserving_relative_paths | aligned — root/nested/deep bytes verified; no-assets case tolerated (empty list) |
| AC-452 schema failure → SiteLoadError + JSON pointers | test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers | aligned — two violations, /theme/palette/primary + /pages/0/id, no output written |
| AC-453 missing/malformed site.json → SiteLoadError | test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror | aligned — both (a) absent and (b) bad JSON; path named; no output |
| AC-454 --clean wipes output | test_UAT_AC454_clean_flag_wipes_output_directory | aligned — stale file removed with clean, preserved without |
| AC-455 CLI non-zero + stderr | test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure | aligned — non-zero exit, "Generation failed:" on stderr, no success summary on stdout |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | AC-449 / test_UAT_AC449 | — | AC-449's Verification prose calls for case (c) to be "a page with no seoMeta and no page title", exercising the businessName fallback. The test's case (c) supplies a page title ("Plain Title C"). However `Page.title` is `z.string().min(1)` (REQUIRED) in packages/site-schema/src/schema.ts:248, so "no page title" is an impossible validated input and the `... ?? site.config.businessName` branch (tools/generate/src/render.ts:94) is unreachable. The test therefore covers every *reachable* title-resolution path; the AC prose merely names an impossible case. No fix required. | none (optionally soften AC-449 verification wording to drop the unreachable businessName case) |
| 2 | warning | exclusivity | AC-445/446/447/450/451/452 vs test_UAT_FC_REQ-6_generator_* | uat-edit (delete redundant) | Five legacy free-coded generator UATs cover the same scenarios in the same integration shape as the AC-traceable reconciliation UATs: FC_REQ-6_generator_emits_index_html_with_all_module_anchors (≈AC-445/446), _generator_emits_per_site_css_with_theme_tokens (≈AC-447), _generator_preloads_configured_fonts (≈AC-450), _generator_copies_assets_to_output (≈AC-451), _generator_validates_site_def_against_schema (≈AC-452). These FC_* tests are not AC-traceable (TEST-STRATEGY requires every test trace to an AC) and now duplicate same-shape coverage. | Delete the five redundant test_UAT_FC_REQ-6_generator_* files now that AC-traceable equivalents exist; keep the public-site-worker FC_REQ-6 tests (different surface/capability) |

## Notes for the Editor

- This is a clean reconciliation: all 13 ACs (AC-443..AC-455) have exactly one
  substantive, AC-named UAT; none are stubs or AST-only structural checks. Every
  UAT drives the real CLI binary or `runGenerate` and asserts on real emitted
  files — strong evidence validity.
- Finding 2 is hygiene, not drift: the pre-reconciliation FC_REQ-6 generator
  tests are now superseded by the AC-traceable UATs. They are duplicated
  *generator* coverage only; the FC_REQ-6 public-site-worker tests belong to a
  different capability and must NOT be removed by this cleanup.
- No coverage gap, no exclusivity violation among the AC-named UATs themselves,
  and no needs_review — the intent surface is fully reconciled (BUNDLE-2 =
  free_and_reconciled) and the AC layer maps 1:1 to substantive tests.
