---
uid: report-6ce409dd
id: REPORT-704
type: report
title: 'UAT Coverage: Framework Module Catalog'
created_by: xgd
created_at: '2026-06-28T21:10:03.046527+00:00'
updated_at: '2026-06-28T21:10:03.046527+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-3630a42c
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Framework Module Catalog

**Result**: PASS
**AC verdicts**: 32 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 2 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

Both stories under CAP-34 trace to a single reconciled intent. No retired/abandoned intent touches this capability tree.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged_at_commit 8ebe122e (2026-06-25) | Bundles REQ-1..REQ-5 + 3 more. Created STORY-41 (chrome modules) and STORY-42 (content modules) under the Framework Module Catalog capability: the module contract, the typed registry (resolve by id+version, catalog-miss error, full list, browser-safe `/meta` subpath), the six Phase 0 modules, and the content validator's `list-of`/`object`/`enum` shape kinds | YES |

Current cumulative intent = the full BUNDLE-2 ask. Both stories are `story_kind: feature` (ACs and UATs expected). Every AC (AC-411..AC-442) carries `intent_uid=bundle-94e1d1b6`. Nothing in the ledger retires any behavior, so every AC is **active**.

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-41 (chrome: header, hero, footer + contract + registry + /meta) | BUNDLE-2 | aligned | Every body behavior maps to an AC: registry 411-414, contract 415, header 416-417, hero 418-420, footer 421-422, scoped-CSS 423, /meta subpath 424. No behavior in the body lacks AC/test coverage; no stale claim. |
| STORY-42 (content: text-block, services-grid, contact-form + validator + registry coverage) | BUNDLE-2 | aligned | Every body behavior maps to an AC: text-block 425-428, services-grid 429-432, contact-form 433-440, validator extensions 441, six-module registry coverage 442. No behavior in the body lacks coverage; no stale claim. |

## Coverage Evidence — How each AC is proven

Real entry points throughout. The only mocking is `fetch` (the external network boundary) in the three progressive-enhancement island tests — correct thin-mock, no internal-component mocking anywhere.

- **Registry / contract (411-415, 442)** — real `getModule()` / `listRegisteredModules()` and real exported `*Meta` objects. 411 resolves component+meta for all chrome modules; 412/413 assert `CatalogMissError` distinguishing unknown-id from unknown-version with diagnostic messages; 414 asserts `{id,version}` pair shape + membership; 415 runtime-introspects each meta against the contract; 442 resolves all six Phase 0 modules at declared versions.
- **Rendered-markup behaviors (416, 418-422, 427-428, 433-434, 436-437)** — real Astro container `renderToString`. Header nav-href resolution (page/anchor/url) and logo; hero bg-color/bg-image with the incidental-image guard; hero CTA omission; footer copyright determinism (year 1999 + byte-identical re-render — directly proves the no-`new Date()` claim); footer optional link row presence/absence; text-block body-element emission and heading omission; contact-form labeled inputs per field type, action URL (two values), Turnstile mount target, no-JS POST.
- **Scoped-CSS contracts anchored to a real render (417, 423, 425, 426, 429, 430, 431, 435)** — Astro's container renderer does not inline scoped `<style>`, so each reads the module's `.astro` source `<style>` block AND renders the component to anchor the rule to the actually-emitted variant/marker class. They assert behavioral CSS: header md-breakpoint nav/toggle inversion (417); theme-token-only color/spacing with a documented mechanical allowlist (423); text-block container-width tier per variant (425/426); services-grid column counts inside/outside the md media query (429/430/431); honeypot off-screen concealment (435). These verify the styling contract, not mere name presence.
- **Client island (438, 439, 440)** — jsdom + the real `enhanceContactForm` from `client.js`, `fetch` thin-mocked. 438 asserts native-submit prevented + POST JSON body keyed by field name to the action URL; 439 asserts form replacement with configured/default success message (role=status); 440 asserts form persists + inline error (role=alert) for JSON-`{error}` 400 and non-JSON 500.
- **Validator (432, 441)** — real `validateModuleContent` with real/constructed metas. 432 enforces services-grid 2..6 cardinality (reject 1 "at least 2", reject 7 "at most 6", accept 2/3/6) with `items` path. 441 exercises `list-of` (min/max), nested `object` (wrong type + missing required → `profile.name` path), and `enum` (rejection names the accepted set).

## Findings — Categorized by Editor Action

None. No coverage gaps, no stale story bodies, no deprecations, no needs_review.

## Notes for the Editor

Two tracked nuances — neither is a coverage gap; both are documented and intentional, so they are notes, not findings:

1. **AC-427 (text-block markdown)** — the test feeds *pre-rendered HTML* into `body` rather than raw markdown, then asserts each element type appears in the body region. This matches the framework convention that markdown body fields are pre-rendered upstream (cf. `hero.subhead`) and the module passes through via `set:html`. The test substantively proves the module's actual contract (HTML pass-through into the body region across all element kinds). If a future intent moves markdown→HTML conversion *into* the module, this AC/test should be revisited.

2. **AC-423 (scoped-CSS allowlist)** — the theme-token scan allowlists a few mechanical literals (`4px`, `0.4rem`, `999px` — header hamburger geometry; `1px`/`-1px` hairlines; `9999px` pill radius). These are token-substitutable and fall within the AC's carve-out ("spacing values *for theme-governed dimensions*", framework-policy exceptions permitted). Worth an opportunistic code-conformance pass later to tokenize the hamburger geometry; tracked, not a coverage defect.
