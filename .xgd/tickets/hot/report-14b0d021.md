---
uid: report-14b0d021
id: REPORT-676
type: report
title: 'Capability-Intent Alignment: Static Site Generator (level=ac)'
created_by: xgd
created_at: '2026-06-28T20:24:06.806894+00:00'
updated_at: '2026-06-28T20:24:06.806894+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-820fbc22
  level: ac
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Static Site Generator
# Level: ac

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

The capability ticket (CAP-35) carries no `intent_uid`/`updated_by`. Its sole
story STORY-43 (`story_kind=feature`) is anchored to `bundle-94e1d1b6`
(BUNDLE-2), the reconciled bundle of REQ-1..REQ-8. The substantive intent for
this capability is **REQ-6** ("tools/generate + 1st Contact marketing site
definition + wire public-site") carried inside that bundle. All 13 ACs were
created 2026-06-25 from the same reconciliation; none carry a divergent intent
chain.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) → REQ-6 | free_and_reconciled | merged 2026-06-25 (commit 8ebe122e) | Created the file-backed Static Site Generator: `runGenerate` API + `fc-generate` CLI; load/parse/validate `site.json` against site-schema; render module instances via Astro Container with anchor wrap; per-site `theme.css` (theme tokens + module styles); `<head>` viewport/SEO/OG + vetted Google-Fonts links; recursive asset copy; `--clean` | YES |

Boundary note (from REQ-6/REQ-7 split): the contact-form **Turnstile** `<head>`
emission is owned by the lead-capture story (REQ-7), not this capability —
correctly excluded from STORY-43's ACs.

## Alignment Ledger

All 13 ACs align to REQ-6 (via BUNDLE-2). At `ac` level the story body is the
working reference; intent was consulted only where the story body was
internally ambiguous (AC-449 title resolution).

| Element | Intents aligned to | Outcome |
|---|---|---|
| AC-443 (CLI flags + success summary) | REQ-6 | aligned — body covers `--site/--out/--clean`, exit 0, and one-line summary |
| AC-444 (runGenerate result) | REQ-6 | aligned |
| AC-445 (HTML5 doc at slug-derived path) | REQ-6 | aligned — `slugToOutputPath` (render.ts:171) grounds the "slug-derived path" elaboration |
| AC-446 (anchor wrap: id + data-module-instance) | REQ-6 | aligned |
| AC-447 (theme.css = tokens + module styles) | REQ-6 | aligned |
| AC-448 (page links /assets/theme.css) | REQ-6 | aligned |
| AC-449 (head viewport/title/desc/OG, seoMeta-first chain) | REQ-6 | aligned — `seoMeta` field is real (schema.ts:249); AC sharpens the story body's circular fallback phrasing |
| AC-450 (Google Fonts preconnect/preload/stylesheet) | REQ-6 | aligned |
| AC-451 (assets copied to <out>/assets/site/ preserving paths) | REQ-6 | aligned |
| AC-452 (schema failure → SiteLoadError + JSON-pointer report) | REQ-6 | aligned |
| AC-453 (missing/malformed site.json → SiteLoadError + path) | REQ-6 | aligned |
| AC-454 (--clean wipes output dir) | REQ-6 | aligned |
| AC-455 (CLI non-zero exit + stderr on failure) | REQ-6 | aligned |

### Property checks

- **Consistency**: every AC follows from the STORY-43 body. Two AC bodies add
  precision beyond the story's prose (AC-445 "slug-derived output path";
  AC-449 "seoMeta-first fallback chain"). Both are consistent elaborations,
  not drift — each is grounded in real schema/code (`schema.ts:249`,
  `render.ts:171`) and the story body's corresponding clauses ("Pages emit a
  valid HTML5 document"; title "with sensible fallbacks ... and site business
  name").
- **Coverage**: the story's full in-scope surface maps to ACs — programmatic
  API (AC-444), CLI happy/fail paths (AC-443/AC-455), load+validate
  (AC-452/AC-453), render+anchor+HTML5 (AC-445/AC-446), theme.css
  (AC-447/AC-448), `<head>` SEO+fonts (AC-449/AC-450), asset copy (AC-451),
  clean (AC-454). No uncovered behavior. The CLI success-summary print —
  initially a suspected gap — is covered by AC-443's body.
- **Exclusivity**: no two ACs describe the same criterion. AC-452 (schema-valid
  JSON but schema-invalid → violation report) and AC-453 (file
  missing/unparseable → file path) are distinct error triggers; AC-443
  (success-path config) and AC-455 (failure-path exit) are distinct; AC-449
  (SEO meta) and AC-450 (fonts) are distinct `<head>` concerns.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | AC-449 | — | AC body names a `seoMeta`-first fallback chain not spelled out in the STORY-43 body (whose title-fallback phrasing is circular). Verified consistent: `seoMeta` exists (schema.ts:249) and REQ-6 calls for SEO title/description/og:image. | none |
| 2 | info | coverage | STORY-43 | — | Turnstile `<head>` emission is intentionally excluded from this capability's ACs and assigned to the lead-capture story (REQ-7). Correct boundary per the REQ-6/REQ-7 split. | none |

## Notes for the Editor

No action required. The AC tree is a faithful, complete, and non-overlapping
decomposition of STORY-43, which itself aligns to REQ-6 (the only substantive
intent touching this capability). The two info entries record where ACs are
more precise than the story prose; both were spot-checked against the schema
and generator source and found consistent — they are alignment evidence, not
drift.
