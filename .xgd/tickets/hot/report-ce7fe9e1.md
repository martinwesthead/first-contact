---
uid: report-ce7fe9e1
id: REPORT-666
type: report
title: 'Capability-Intent Alignment: Public Site Delivery (level=uat)'
created_by: xgd
created_at: '2026-06-28T19:58:09.037347+00:00'
updated_at: '2026-06-28T19:58:09.037347+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: capability_validation
  subject_uid: capability-474ee896
  level: uat
  violations: 2
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Public Site Delivery
# Level: uat

**Result**: FAIL
**Violations**: 2
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

At `uat` level the AC bodies are the working reference (ac-level alignment ran
first and passed — REPORT-664, 0 violations). Intent history was consulted only
to confirm the active-AC set, not re-litigated. CAP-36 has a single feature
story (STORY-44), whose `intent_uid` is BUNDLE-2 — the only intent that has
touched this capability's tree.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged @ 8ebe122e | Real 1stcontact site definition, public-site Worker serving via Workers Static Assets (GET+HEAD delegation, plain-text 404), generate-before-deploy/CI ordering, production-env ASSETS binding. | YES |

AC-615 and AC-616 are active ACs added during the ac-level fix loop (created
2026-06-28) and were confirmed aligned to BUNDLE-2 by the ac-level pass
(REPORT-664). Both are therefore in-scope active criteria that require
substantive UAT coverage at this level.

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
| AC-615 (production [env.production.assets] block in wrangler.toml) | — none — | GAP: no UAT asserts the production env assets block |
| AC-616 (HEAD / → 200 via ASSETS binding) | — none — | GAP: no UAT issues a HEAD request anywhere |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | violation | coverage | AC-616 | uat-add | No UAT exercises a HEAD request. Grep for any `HEAD`-method test across `tests/` returns zero matches. AC-616 (active, aligned to BUNDLE-2) requires a test harness to issue HEAD `/` and observe 200. Production code is correct — `apps/public-site/src/index.ts:24` delegates both GET and HEAD to the `ASSETS` binding — so this is a test gap, NOT a code bug. | Add a UAT (e.g. extend the existing `unstable_dev` suite in test_UAT_AC458_AC459_AC460_*.test.ts) that does `worker.fetch("/", { method: "HEAD" })` and asserts status 200. |
| 2 | violation | coverage | AC-615 | uat-add | No UAT reads `apps/public-site/wrangler.toml` and asserts the `[env.production.assets]` block (directory `./public`, binding `ASSETS`) alongside the top-level `[assets]` block. The only test that parses this TOML, test_UAT_AC389_*, asserts solely the top-level `name` field (`tomlTopName`) and breaks parsing at the first section header (line 25), so it never inspects assets blocks. Production config is correct (`wrangler.toml:8-10` and `:38-40`) — test gap only. | Add a UAT that reads the public-site wrangler.toml and asserts both an `[assets]` and an `[env.production.assets]` block, each with `directory = "./public"` and `binding = "ASSETS"`, and that the two directories match. |
| 3 | warning | exclusivity | AC-458/AC-459/AC-460 vs FC_REQ-6 trio | uat-edit (remove duplicates) | Three reconciliation-era tests — test_UAT_FC_REQ-6_public_site_serves_generated_index.test.ts, test_UAT_FC_REQ-6_public_site_serves_generated_css.test.ts, test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path.test.ts — verify the same three scenarios (GET / → 200, GET /assets/theme.css → 200, unknown path → 404) in the same shape (`unstable_dev` integration) as the matrix UATs test_UAT_AC458/AC459/AC460. Same scenario, same shape = redundant. | Opportunistically remove the FC_REQ-6 trio; the AC-named UATs cover the same scenarios with stricter assertions. Does not affect pass/fail. |

## Notes for the Editor

The two violations share a root cause: the ac-level fix loop added AC-615 and
AC-616 (and their production code already existed and is correct), but no
matching UATs were authored. The fix here is purely additive test work — do NOT
touch production code (`index.ts` and `wrangler.toml` already satisfy both ACs):

- AC-616: the cheapest add is one more `it()` in the existing
  test_UAT_AC458_AC459_AC460_*.test.ts suite (the `unstable_dev` worker is
  already booted there), issuing HEAD `/` and asserting 200.
- AC-615: a small static-config UAT reading wrangler.toml. Note test_UAT_AC389's
  `tomlTopName` helper deliberately stops at the first `[` section header, so it
  cannot be reused to read the assets blocks — a proper section-aware read (or a
  scoped regex over the `[env.production.assets]` block) is needed.

This is attempt 2 — the prior uat-level fix did not add these two UATs. The
production behaviour is verified-correct; only the test evidence is missing.
