---
uid: report-5f44187c
id: REPORT-683
type: report
title: 'Capability-Intent Alignment: Framework Module Catalog (level=story)'
created_by: xgd
created_at: '2026-06-28T20:36:14.560152+00:00'
updated_at: '2026-06-28T20:36:14.560152+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-3630a42c
  level: story
  violations: 0
  warnings: 2
  needs_review_count: 0
---

# Capability-Intent Alignment: Framework Module Catalog
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 2
**Needs review**: 0

## Cumulative Intent Considered

Both stories under CAP-34 carry `fields.intent_uid = bundle-94e1d1b6` (BUNDLE-2). The bundle is a single reconciled intent ticket aggregating REQ-1..REQ-8; it carries `status=free_and_reconciled` and `merged_at_commit=8ebe122e`. The catalog-relevant intent sections, in chronological/section order:

| Intent (section of BUNDLE-2) | Status | When | Asked / changed (catalog-relevant) | Counts? |
|---|---|---|---|---|
| REQ-3 (site-schema) | free_and_reconciled | merged 8ebe122e | Widened `ContentValue` to admit object-shaped content fields (nav entries, CTAs, services-grid items, contact-form fields) used by the Phase-0 catalog; declared catalog membership is the framework's job, not the schema's | YES |
| REQ-4 (framework: tokens/CSS gen, registry, chrome modules) | free_and_reconciled | merged 8ebe122e | Module contract (`moduleMeta`: id, version, variants, dials, contentSchema), typed registry with `getModule(id,version)` + clear catalog-miss error, header/hero/footer modules, scoped CSS referencing tokens only, type-level contract test. (Token system + CSS generator portion belongs to the separate Theme Tokens capability / STORY-40.) | YES |
| REQ-5 (framework: content modules) | free_and_reconciled | merged 8ebe122e | text-block / services-grid / contact-form modules, content-shape validation (list-of N..M, nested object, enum) exercised by these modules' content, registry extended to all six Phase-0 modules, contact-form progressive enhancement with no-JS HTML POST path | YES |
| REQ-8 (Builder v1) | free_and_reconciled | merged 8ebe122e | Added browser-safe `@1stcontact/framework/meta` subpath re-exporting only the module metas (no Astro components, no `node:fs`) so the builder SPA can bundle the catalog without server-only deps | YES |

BUNDLE-2 created 2026-06-15, last updated 2026-06-25. No abandoned/deprecated/draft intents touch this capability. No `updated_by` chain present on either story or on the capability.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| STORY-41 (story-1d5b450f) — chrome modules under typed registry | REQ-4 (catalog portion), REQ-8 (`/meta` subpath) | aligned |
| STORY-42 (story-f1e061ba) — content modules + validator extensions | REQ-5, REQ-3 (object content), REQ-4 (shared contract/registry) | aligned (two low-impact field-level warnings, see findings 1–2) |

Notes on specific alignment judgments:
- **STORY-41 `/meta` subpath** — REQ-4's "Build & packaging" section lists only `tokens, modules, registry` and does not mention a browser-safe `/meta` subpath. However the behavior IS in cumulative intent: REQ-8 (BUNDLE-2, free_and_reconciled) explicitly adds `@1stcontact/framework/meta`. The capability body deliberately places this subpath under the catalog capability ("A browser-safe subpath exports just the module metas…"). Placement under the chrome-modules story (which establishes the registry/packaging) is consistent. **Aligned, not a finding** — sourced from REQ-8 rather than REQ-4.
- **STORY-41 `listRegisteredModules()` + "known id / unknown version" catalog-miss distinction** — these are elaborations beyond REQ-4's literal "throws a clear catalog-miss error." They are consistent with REQ-4's stated purpose ("the registry is how `tools/generate` discovers modules" → listing) and versioned lookups. Aligned; recorded as elaboration, not drift.
- **STORY-42 content-validator extensions (list-of min/max, nested object, enum)** — REQ-5 does not name a "content validator" verbatim, but REQ-4 explicitly defers "per-instance dial validation … as a small helper in REQ-5," and REQ-5's content shapes (services-grid items 2..6, contact-form fields 1..8, object items, enum field types) require exactly this validation surface. The story makes explicit what REQ-5 implies. Aligned.
- **Registry membership division** — STORY-41 introduces the registry/contract; STORY-42 extends membership to all six modules. Sequential extension, not overlapping intent. No exclusivity violation.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | consistency | STORY-42 (story-f1e061ba) | story-body-edit | REQ-5 (line: text-block dials) lists BOTH `align (left/center)` and `textAlign (left/center)` for `text-block`; STORY-42's text-block dial list is `size, textAlign, spacingTop, spacingBottom, surface` — it expresses `textAlign` but drops `align`. The two are semantically identical (both left/center) so this is most likely intent-side redundancy that the story consolidated; low impact, does not block. | Editor: confirm `align` vs `textAlign` are the same dial and either restore both or annotate the consolidation (defer concrete dial set to AC level). |
| 2 | warning | coverage | STORY-42 (story-f1e061ba) | story-body-edit | REQ-5 lists optional `heading` and `subhead` content fields for `services-grid` and `contact-form`; STORY-42's in-scope bullets for those two modules do not mention them (text-block's `heading` IS mentioned). These are optional presentational section-header fields; their omission from the story summary is granularity, not contradicted behavior. Better captured at AC level. | Editor: optionally note the optional `heading`/`subhead` fields for services-grid and contact-form; ensure AC-level cycle covers them. |
| 3 | info | — | STORY-41 (story-1d5b450f) | — | `/meta` browser-safe subpath claimed by STORY-41 is sourced from REQ-8 (not REQ-4) yet correctly placed under this capability per the capability body. Alignment-ledger entry only — no action. | none |

## Notes for the Editor

- **No story-level drift blocks this capability.** Both stories accurately reflect cumulative intent; coverage of the catalog surface (contract, registry, six modules, scoped CSS, content-validator extensions, `/meta` subpath) is complete; the two stories partition cleanly with no overlap.
- **REQ-4 is a cross-capability intent.** Its bulk (theme tokens + CSS generator) belongs to the Theme Tokens capability (STORY-40), not this one — STORY-41 explicitly depends on STORY-40. Only REQ-4's registry/contract/chrome-module portion lands here, and it is fully expressed. This is correct partitioning, not a coverage gap; flagged so a future check doesn't mis-read REQ-4's token surface as missing from CAP-34.
- **Both warnings are field/dial-granularity items** that the downstream AC-level cycle is better positioned to resolve; neither contradicts intent. Recorded here for traceability rather than as blockers.
