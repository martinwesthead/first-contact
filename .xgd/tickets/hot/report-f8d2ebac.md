---
uid: report-f8d2ebac
id: REPORT-692
type: report
title: 'Capability-Intent Alignment: Framework Module Catalog (level=uat)'
created_by: xgd
created_at: '2026-06-28T20:46:33.731954+00:00'
updated_at: '2026-06-28T20:46:33.731954+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: capability_validation
  subject_uid: capability-3630a42c
  level: uat
  violations: 1
  warnings: 4
  needs_review_count: 0
---

# Capability-Intent Alignment: Framework Module Catalog
# Level: uat

**Result**: FAIL
**Violations**: 1
**Warnings**: 4
**Needs review**: 0

## Cumulative Intent Considered

Both stories under CAP-34 carry a single `intent_uid`: `bundle-94e1d1b6` (BUNDLE-2). No `updated_by` chain on the capability, stories, or ACs — no later intent has touched this tree.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6; rolls up REQ-1..REQ-5 + 3 more) | free_and_reconciled (result=pass, merged_at_commit 8ebe122e) | created 2026-06-15, reconciled 2026-06-25 | Established the framework module catalog: common module contract (id/version/variants/dials/contentSchema), typed registry with catalog-miss error + browser-safe `/meta` subpath, three chrome modules (header/hero/footer), three content modules (text-block/services-grid/contact-form) with progressive-enhancement form and content-validator extensions. REQ-4 explicitly leaves catalog-membership validation out of site-schema. | YES |

The intent ledger is a single reconciled bundle; there are no retired or competing intents. At `uat` level the AC bodies are therefore taken as the aligned working reference, and the check focuses on whether each AC's test substantively exercises the claimed behavior. Both stories are `reconciling` (matrix-element lifecycle), which is consistent with the bundle being reconciled.

## Alignment Ledger

1:1 mapping confirmed — every active AC (AC-411..AC-442) has exactly one `test_UAT_AC<n>_*.test.ts`. Coverage is structurally complete; the findings are about test substance, not absence.

| Element (AC → test) | Aligned to | Outcome |
|---|---|---|
| AC-411..AC-414 registry (resolve / catalog-miss id / catalog-miss version / list) | BUNDLE-2 | aligned — drive real `getModule` / `listRegisteredModules` / `CatalogMissError` |
| AC-415 chrome meta conforms to contract | BUNDLE-2 | aligned — meta-shape AC, meta-only checking appropriate |
| AC-416 header logo+entries / AC-417 header md collapse | BUNDLE-2 | aligned — render Header; AC-417 asserts emitted scoped-CSS media query mechanism |
| AC-418/419/420 hero variants + CTA omission | BUNDLE-2 | aligned — render Hero, assert bg-image presence/absence + CTA omission |
| AC-421 footer year-as-constant / AC-422 footer optional links | BUNDLE-2 | aligned — AC-421 also asserts determinism + absence of current year |
| AC-423 chrome scoped CSS uses theme custom props only | BUNDLE-2 | **gap (warning)** — enforces hex-color + font-family tokens but not the AC's "no hard-coded spacing / non-hex color" claim |
| AC-424 browser-safe `/meta` subpath, no server deps | BUNDLE-2 | aligned — imports real `@1stcontact/framework/meta`, walks import graph asserting no `.astro` / Node-only deps |
| AC-425/426 text-block prose vs landing container | BUNDLE-2 | aligned — renders variant marker; container token via source rule (minor) |
| AC-427 markdown body / AC-428 heading omission | BUNDLE-2 | aligned — render + assert emitted elements |
| AC-429 services-grid three-col@md | BUNDLE-2 | **gap (warning)** — renders marker+card count; column/breakpoint proven only by `.astro` source grep |
| AC-430 services-grid two-col@md | BUNDLE-2 | **gap (warning)** — same source-grep pattern as AC-429 |
| AC-431 services-grid collapse below md | BUNDLE-2 | **VIOLATION** — test does not render at all; pure source-text/AST analysis, no entry-point execution |
| AC-432 services-grid item-count 2..6 | BUNDLE-2 | aligned — drives real `validateModuleContent`, asserts `items` path + bounds |
| AC-433 contact-form labeled inputs per field | BUNDLE-2 | aligned — render, assert input/label/type/name/required per field |
| AC-434/436/437 contact-form action URL / Turnstile mount / no-JS POST | BUNDLE-2 | aligned — render + assert action, mount-target, method=post w/o inline interceptor |
| AC-435 hidden honeypot visually concealed | BUNDLE-2 | **gap (warning)** — asserts `aria-hidden`/`tabindex`/name but not the AC-required visual (off-screen) concealment |
| AC-438/439/440 contact-form island intercept / 2xx success / non-2xx error | BUNDLE-2 | aligned — `@vitest-environment jsdom`, executes real `enhanceContactForm`, asserts fetch JSON body + DOM replacement / inline error |
| AC-441 validator list-of/object/enum / AC-442 registry resolves six modules | BUNDLE-2 | aligned — real validator + real `getModule` for all six |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | violation | coverage | AC-431 (acceptance_criterion-de6da419) → tests/test_UAT_AC431_services_grid_collapses_to_single_column_below_md.test.ts | uat-edit | The AC claims services-grid renders a single column below `md`. The test never renders the module — it reads `services-grid/index.astro` as source text and brace-matches the `@media (min-width:768px)` block. This is a pure structural/AST check with no entry-point execution, which the uat-level bar explicitly excludes ("exercises real entry points, not just a structural/AST check"). | Render `ServicesGrid` via AstroContainer and assert on the emitted scoped `<style>` that the base rule is single-column (`1fr`) and the `repeat(N,1fr)` rule lives only inside the `min-width:768px` media query — the same emitted-scoped-CSS technique AC-417's header test already uses successfully. |
| 2 | warning | consistency | AC-429 (acceptance_criterion-350bc685) → tests/test_UAT_AC429_services_grid_three_col_at_md_breakpoint.test.ts | uat-edit | Test renders the three-col variant marker + 3 cards, but the AC's actual claim (three columns at/above `md`) is proven only by grepping `.astro` source for `repeat(3,1fr)`. Card count ≠ column count; render does not assert the column behavior. | Assert `repeat(3,1fr)` inside the `min-width:768px` media query from the rendered component's emitted scoped `<style>` (per AC-417 technique), keyed to the rendered variant class. |
| 3 | warning | consistency | AC-430 (acceptance_criterion-ea58fc85) → tests/test_UAT_AC430_services_grid_two_col_at_md_breakpoint.test.ts | uat-edit | Same defect as #2 for the two-col variant — `repeat(2,1fr)` at `md` is source-grepped, not asserted from rendered output. | Mirror the AC-429 fix: assert `repeat(2,1fr)` at `min-width:768px` from emitted scoped CSS. |
| 4 | warning | consistency | AC-423 (acceptance_criterion-5a232295) → tests/test_UAT_AC423_chrome_module_scoped_css_uses_theme_custom_properties.test.ts | uat-edit | AC (and STORY-41 body) require scoped CSS to use theme custom properties only — "no hard-coded colors or spacing values." Test enforces hex-color rejection + font-family tokens + no inline root style, but does not reject `px`/`em`/`rem` spacing literals or non-hex color functions; prod CSS ships hard-coded `px` spacing and an `rgba()` hero scrim that pass. | Tighten the per-module CSS scan so theme-governed properties (color/background/padding/margin/gap/border-radius) must resolve from `var(--...)`, flagging length/`rgba()`/`hsl()` literals — with an explicit, documented allowlist for genuinely non-token values (e.g. 1px borders, pill-radius). See editor note re: possible prod-CSS conformance gap. |
| 5 | warning | consistency | AC-435 (acceptance_criterion-6e10cfab) → tests/test_UAT_AC435_contact_form_renders_hidden_honeypot_input.test.ts | uat-edit | AC requires the honeypot to be rendered AND visually concealed. Test asserts `aria-hidden`, `tabindex="-1"`, `name`, and `data-fc-honeypot`, but never asserts visual concealment. The off-screen rule exists in `contact-form/index.astro` but is unverified. | Assert the rendered scoped style applies off-screen concealment to the honeypot (e.g. `position:absolute; left:-10000px` or equivalent clip/offscreen) on the `.fc-contact-form__honeypot` rule. |

## Notes for the Editor

- **Services-grid responsive trio (AC-429/430/431) share one root cause:** the column/breakpoint behavior — the entire point of each AC — is verified by reading `.astro` source rather than by rendering and asserting on the emitted scoped `<style>`. The "scoped CSS can't be observed in vitest" assumption is false here: the AC-417 header test already renders the component and asserts on the emitted `<style>` media query. The cheapest correct fix reuses that technique for all three. AC-431 is the violation (no render at all); AC-429/430 are warnings (render occurs but under-asserts).
- **AC-423 may also surface a code conformance question, not only a test gap.** STORY-41's body states modules use theme tokens "only — no hard-coded colors or spacing values," yet prod scoped CSS contains literal `px` spacing and an `rgba(0,0,0,0.3)` hero overlay. Some of these are plausibly legitimate non-token values (1px borders, pill-radius `999px`, an overlay scrim). Because the literal AC text and the defensible CSS practice diverge, this is left as a warning with a uat-edit that requires an explicit allowlist, rather than asserting a code bug. If the editor judges the literals to be genuine intent violations, escalate AC-423 to a `code-issue` against the module CSS.
- **No needs_review:** the intent ledger is a single reconciled bundle (BUNDLE-2, pass); there is no ambiguity about whether any tested behavior is active intent.
- **JS-behavior ACs are correctly built:** AC-438/439/440 genuinely execute the contact-form client island under jsdom (real submit dispatch, mocked fetch, DOM-replacement assertions) — not source-grep or static-script-presence checks. No fix needed there.
