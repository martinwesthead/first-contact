---
uid: report-b816571d
id: REPORT-668
type: report
title: 'Capability-Intent Alignment: Public Site Delivery (level=uat)'
created_by: xgd
created_at: '2026-06-28T20:04:21.953426+00:00'
updated_at: '2026-06-28T20:04:21.953426+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-474ee896
  level: uat
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Public Site Delivery
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

At `uat` level the AC bodies are the working reference (ac-level alignment ran
first and passed — REPORT-664, 0 violations). CAP-36 has a single feature story
(STORY-44), whose `intent_uid` is BUNDLE-2 — the only intent that has touched
this capability's tree.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged @ 8ebe122e | Real 1stcontact site definition, public-site Worker serving via Workers Static Assets (GET+HEAD delegation, plain-text 404), generate-before-deploy/CI ordering, production-env ASSETS binding. | YES |

This is attempt 2. Attempt 1 (REPORT-666) found two coverage violations — AC-615
and AC-616 had no UATs. The `fix_uat_validation` workflow (commit 813bd5ae)
authored both missing tests; this re-check confirms they are substantive and
correctly scoped. No production code was touched (it was already correct).

## Alignment Ledger

UAT-to-AC coverage for every active AC under STORY-44 (all aligned to BUNDLE-2):

| AC | UAT(s) | Outcome |
|---|---|---|
| AC-456 (seven-module home page, in-page-anchors) | test_UAT_AC456_marketing_site_definition_seven_modules.test.ts | aligned — loads sites/1stcontact/site.json, validates against @1stcontact/site-schema, asserts the 7 module instances in order |
| AC-457 (Manrope/Inter typography, #2563eb/#f59e0b palette) | test_UAT_AC457_marketing_site_typography_and_palette.test.ts | aligned — validates real site.json, asserts theme family/palette values |
| AC-458 (GET / → 200 HTML w/ module anchors) | test_UAT_AC458_get_root_returns_marketing_html_with_anchors (in test_UAT_AC458_AC459_AC460_*.test.ts) | aligned — runs Worker via unstable_dev against freshly generated bundle, asserts doctype + "1st Contact" + id="hero" |
| AC-459 (GET /assets/theme.css → token decls) | test_UAT_AC459_get_theme_css_returns_token_declarations (same file) | aligned — asserts --color-primary:#2563eb and --space-4 |
| AC-460 (GET unknown path → 404) | test_UAT_AC460_get_unknown_path_returns_404 (same file) | aligned — asserts 404 on /does-not-exist-anywhere |
| AC-461 (build/deploy/dryrun regenerate first) | test_UAT_AC461_public_site_scripts_regenerate_bundle.test.ts | aligned — parses app package.json scripts, asserts generate runs before tsc/wrangler |
| AC-462 (CI generate before tests + dryrun) | test_UAT_AC462_ci_workflow_generates_before_tests_and_dryrun.test.ts | aligned |
| AC-463 (deploy generate before wrangler deploy) | test_UAT_AC463_deploy_workflow_generates_before_wrangler_deploy.test.ts | aligned |
| AC-615 (production [env.production.assets] block in wrangler.toml) | test_UAT_AC615_public_site_wrangler_declares_production_assets_block.test.ts (3 its) | aligned (NEWLY ADDED) — section-aware read of the real wrangler.toml asserts top-level [assets] and [env.production.assets] each declare directory="./public" / binding="ASSETS", and that the two directories match. Same valid config-assertion shape as AC-462/AC-463. |
| AC-616 (HEAD / → 200 via ASSETS binding) | test_UAT_AC616_head_root_returns_200_via_assets_binding (in test_UAT_AC458_AC459_AC460_*.test.ts) | aligned (NEWLY ADDED) — runs the Worker via unstable_dev, issues HEAD / and asserts 200, exercising the same GET/HEAD delegation path (index.ts:24) |

All 10 active ACs now have at least one substantive UAT exercising a real entry
point (live Worker via unstable_dev, real site.json/schema validation, real
config/workflow file parsing). No structural/AST-only placeholders.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | exclusivity | AC-458/AC-459/AC-460 vs FC_REQ-6 trio | uat-edit (remove duplicates) | Three reconciliation-era tests — test_UAT_FC_REQ-6_public_site_serves_generated_index.test.ts, test_UAT_FC_REQ-6_public_site_serves_generated_css.test.ts, test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path.test.ts — still verify the same three scenarios (GET / → 200, GET /assets/theme.css → 200, unknown path → 404) in the same shape (`unstable_dev` integration) as the matrix UATs test_UAT_AC458/AC459/AC460. Same scenario, same shape = redundant. Carried over from REPORT-666; not addressed by the AC-615/616 fix. | Opportunistically remove the FC_REQ-6 public-site trio; the AC-named UATs cover the same scenarios with stricter assertions. Does not affect pass/fail. |

## Notes for the Editor

The two violations from attempt 1 (REPORT-666) are resolved:

- AC-616 → test_UAT_AC616_head_root_returns_200_via_assets_binding was added as a
  fourth `it()` in the existing booted-worker suite, reusing the live
  `unstable_dev` worker — exactly the cheapest fix suggested in REPORT-666.
- AC-615 → test_UAT_AC615_*.test.ts was authored with a proper section-aware TOML
  read (the `tomlSection` helper correctly stops at the next `[` header), which
  REPORT-666 specifically noted was required because AC-389's `tomlTopName`
  helper could not be reused.

The remaining FC_REQ-6 exclusivity warning is a pre-existing reconciliation-era
duplication (cf. commit e6cf3e68 which removed analogous FC duplicates for the
Builder UI capability but left the public-site trio). It is opportunistic
cleanup and does not block this level.
