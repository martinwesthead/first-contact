---
uid: report-7f1339e9
id: REPORT-702
type: report
title: 'Capability-Intent Alignment: Framework Module Catalog (level=uat)'
created_by: xgd
created_at: '2026-06-28T21:03:00.629663+00:00'
updated_at: '2026-06-28T21:03:00.629663+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-3630a42c
  level: uat
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Framework Module Catalog
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

Both stories under CAP-34 trace to a single reconciled intent.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged_at_commit 8ebe122e, completed 2026-06-25 | Bundles REQ-1..REQ-5 + 3 more; created STORY-41 (chrome modules) and STORY-42 (content modules) under the Framework Module Catalog capability, including the module contract, typed registry, content validator, and all six Phase 0 modules | YES |

No retired/abandoned intents touch this capability's tree. Both stories (STORY-41, STORY-42) and all 32 ACs carry `intent_uid=bundle-94e1d1b6`. The bundle is fully reconciled, so its entire ask counts toward cumulative intent. Per the level cascade, story and AC layers are assumed aligned (their cycles ran earlier in report-cda4212b); AC bodies are the working reference at uat level.

## Alignment Ledger

At uat level the elements are the tests; each is recorded against the AC it proves.

| Element (test) | AC | Intents aligned to | Outcome |
|---|---|---|---|
| test_UAT_AC411 registry resolves known module | AC-411 | BUNDLE-2 | aligned — real `getModule`, asserts meta+Component for header/hero/footer |
| test_UAT_AC412 catalog-miss unknown id | AC-412 | BUNDLE-2 | aligned — throws `CatalogMissError`, asserts message names registered ids |
| test_UAT_AC413 catalog-miss unknown version | AC-413 | BUNDLE-2 | aligned — asserts moduleId+version on error, message lists real version |
| test_UAT_AC414 full module list | AC-414 | BUNDLE-2 | aligned — real `listRegisteredModules`, {id,version} shape + membership |
| test_UAT_AC415 chrome meta conforms to contract | AC-415 | BUNDLE-2 | aligned — runtime checks of id/version/variants/dials/contentSchema |
| test_UAT_AC416 header logo + entries | AC-416 | BUNDLE-2 | aligned — real Astro render, one anchor per nav target kind |
| test_UAT_AC417 header collapses below md | AC-417 | BUNDLE-2 | aligned — render proves toggle/aria-controls/nav; scoped CSS proves md inversion |
| test_UAT_AC418 hero bg-color no image | AC-418 | BUNDLE-2 | aligned — render asserts no bg-image element even when image supplied |
| test_UAT_AC419 hero bg-image renders image | AC-419 | BUNDLE-2 | aligned — render asserts img with supplied src/alt |
| test_UAT_AC420 hero omits CTA | AC-420 | BUNDLE-2 | aligned — render asserts no cta anchor when cta omitted |
| test_UAT_AC421 footer copyright year-as-constant | AC-421 | BUNDLE-2 | aligned — uses 1999, asserts current year absent + byte-stable re-render |
| test_UAT_AC422 footer optional links | AC-422 | BUNDLE-2 | aligned — render asserts nav present with links / absent without |
| test_UAT_AC423 chrome CSS uses theme tokens | AC-423 | BUNDLE-2 | aligned — scans shipped scoped CSS for non-token values; render asserts no inline style on root |
| test_UAT_AC424 browser-safe meta subpath | AC-424 | BUNDLE-2 | aligned — meta equality vs registry + static import-graph proves no astro/node deps |
| test_UAT_AC425 text-block prose narrow container | AC-425 | BUNDLE-2 | aligned — render proves variant marker; CSS proves --container-narrow |
| test_UAT_AC426 text-block landing default container | AC-426 | BUNDLE-2 | aligned — render proves variant marker; CSS proves --container-default |
| test_UAT_AC427 text-block markdown body | AC-427 | BUNDLE-2 | aligned — feeds pre-rendered HTML (framework convention) and asserts each element surfaces in body region, exactly the AC's verification step |
| test_UAT_AC428 text-block omits heading | AC-428 | BUNDLE-2 | aligned — render asserts no heading element/class when absent |
| test_UAT_AC429 services-grid three-col at md | AC-429 | BUNDLE-2 | aligned — render proves variant+list; CSS proves repeat(3,1fr) only in md media query |
| test_UAT_AC430 services-grid two-col at md | AC-430 | BUNDLE-2 | aligned — render proves variant+list; CSS proves repeat(2,1fr) only in md media query |
| test_UAT_AC431 services-grid collapses below md | AC-431 | BUNDLE-2 | aligned — render both variants; CSS proves base 1fr + multi-col only inside media query |
| test_UAT_AC432 services-grid item-count 2..6 | AC-432 | BUNDLE-2 | aligned — real `validateModuleContent`, rejects 1 and 7, accepts 2/3/6 with items path |
| test_UAT_AC433 contact-form labeled inputs | AC-433 | BUNDLE-2 | aligned — render asserts label/for + type/name/required per field, textarea for textarea |
| test_UAT_AC434 contact-form action URL | AC-434 | BUNDLE-2 | aligned — render asserts form action, two distinct URLs prove dynamic |
| test_UAT_AC435 contact-form hidden honeypot | AC-435 | BUNDLE-2 | aligned — render asserts aria-hidden+tabindex=-1+name=website; CSS proves off-screen conceal |
| test_UAT_AC436 contact-form turnstile mount | AC-436 | BUNDLE-2 | aligned — render asserts exactly one data-turnstile-target inside form |
| test_UAT_AC437 contact-form no-JS POST | AC-437 | BUNDLE-2 | aligned — render asserts method=post + action + submit button, no inline JS handler |
| test_UAT_AC438 contact-form JS intercept posts JSON | AC-438 | BUNDLE-2 | aligned — jsdom, real `enhanceContactForm`, thin-mock fetch, asserts preventDefault + JSON body |
| test_UAT_AC439 contact-form success on 2xx | AC-439 | BUNDLE-2 | aligned — jsdom, asserts form replaced by success (configured + default), role=status |
| test_UAT_AC440 contact-form inline error on non-2xx | AC-440 | BUNDLE-2 | aligned — jsdom, asserts form stays + error role=alert for 400 and 500 |
| test_UAT_AC441 validator list-of/object/enum | AC-441 | BUNDLE-2 | aligned — real `validateModuleContent`, exercises min/max, nested required, enum values |
| test_UAT_AC442 registry resolves six modules | AC-442 | BUNDLE-2 | aligned — real registry, asserts all six metas registered + resolvable with Component |

## Findings

No violations, warnings, or needs_review items.

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| — | — | — | — | — | None | — |

### Property summary

- **Consistency**: Every test exercises the behavior its AC claims, via real entry points (real `getModule`/`listRegisteredModules`/`validateModuleContent`, real Astro container renders, jsdom + real `enhanceContactForm` for the progressive-enhancement island). No purely structural/AST-only tests. The two tests that initially looked divergent (AC-427, AC-423) were verified against their AC bodies and are consistent (see Notes).
- **Coverage**: All 32 active ACs (AC-411..AC-424 under STORY-41; AC-425..AC-442 under STORY-42) have exactly one substantive UAT. Both stories are `story_kind=feature`, so ACs+UATs are expected and present. No AC lacks a test.
- **Exclusivity**: No two tests verify the same scenario in the same shape. The registry is touched by AC-411 (resolves the three chrome modules to component+meta), AC-414 (list API shape/membership), and AC-442 (all six Phase 0 modules registered/resolvable) — these are distinct claims/scopes, not duplicates.

## Notes for the Editor

- **Source-CSS inspection pattern (acceptable, not a finding):** Eight tests (AC-417, AC-423, AC-425, AC-426, AC-429, AC-430, AC-431, AC-435) read the module's `.astro` scoped `<style>` block from source to assert CSS contracts (responsive breakpoints, off-screen honeypot concealment, container widths). This is a pragmatic necessity — Astro's `experimental_AstroContainer` does not inline scoped styles into `renderToString` output, so a computed-layout assertion is impossible without a real browser. Each of these tests still renders the real component and anchors the CSS assertion to a variant/marker class proven present in the live render. They exercise real entry points; the source read supplements the observable-render assertion. If a future browser-based harness becomes available, these column/breakpoint claims could be upgraded to computed-style assertions, but the current shape is valid evidence.

- **AC-427 (markdown body) — verified consistent:** The test supplies pre-rendered HTML (not raw markdown syntax) and asserts each feature's HTML element surfaces in the body region. The test documents the framework convention that markdown content fields are pre-rendered to HTML upstream (same handling as `hero.subhead`), so the text-block module's contract is HTML pass-through via `set:html`. AC-427's verification step asks exactly this ("body contains each of these markdown features … assert the rendered output contains the corresponding HTML elements"). Markdown→HTML conversion itself lives upstream and is out of this module's scope. Aligned.

- **AC-423 (CSS exclusivity) — verified consistent:** The test carries a documented allowlist of mechanical geometry literals (4px hamburger-bar gap, 0.4rem toggle hit-area padding, 999px pill radius) in the header CSS. This initially reads as a relaxation of "references theme custom properties exclusively," but AC-423's criterion scopes the prohibition to "spacing values **for theme-governed dimensions**" and explicitly permits "neutral-utility colors permitted by the framework's policy." The allowlisted values are decorative icon geometry, not theme-governed content rhythm, so they fall within the AC's own carve-out. The test's own comment flags them as token-substitutable for a possible future code conformance pass — worth tracking opportunistically, but not drift against the current AC. Aligned.
