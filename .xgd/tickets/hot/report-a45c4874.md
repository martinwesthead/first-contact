---
uid: report-a45c4874
id: REPORT-717
type: report
title: 'Capability-Intent Alignment: Site Definition Schema (level=story)'
created_by: xgd
created_at: '2026-06-28T21:29:36.398831+00:00'
updated_at: '2026-06-28T21:29:36.398831+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-b7eebd2b
  level: story
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Site Definition Schema
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

This capability (CAP-32 / capability-b7eebd2b) has a single originating
intent: **BUNDLE-2** (bundle-94e1d1b6), which bundles REQ-1…REQ-8. Three
of those source tickets touch the site-schema contract; the rest do not.
The story's `intent_uid` is the bundle and its `updated_by` chain is
empty — no later intent has modified the matrix element.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | created 2026-06-15; merged_at_commit 8ebe122e | Bundles REQ-1..REQ-8; reconciled as one unit | YES |
| ↳ REQ-3 | (in bundle) | — | Introduced `@1stcontact/site-schema`: types + Zod schema + `validateSite()` returning typed `Site` or `ValidationError[]` with JSON-pointer paths; structural rules; catalog-membership-is-NOT-a-schema-concern boundary | YES |
| ↳ REQ-4 | (in bundle) | — | Widened site-schema `ThemeTokens` to the locked 55-token superset: palette `text` replaces `fg`; 9-step scale adds `5xl`; new `weights`(5)/`lineHeights`(3); geometric 10-step `spacing`; 4-slot `container` replaces single `maxWidth` | YES |
| ↳ REQ-6 | (in bundle) | — | Widened `ContentValue` to `string \| number \| boolean \| null \| AssetRef \| ContentValue[] \| { [key: string]: ContentValue }` to admit object-shaped module content | YES |
| REQ-1, REQ-2, REQ-5, REQ-7, REQ-8 | (in bundle) | — | Monorepo scaffold / rename / framework modules / lead pipeline / builder — do not define the schema contract (REQ-2's rename and REQ-5's object-content trigger are already reflected) | YES (no schema ask) |

**Cumulative intent (steady state):** the `@1stcontact/site-schema`
package as defined by REQ-3, with `ThemeTokens` at REQ-4's superset and
`ContentValue` at REQ-6's widened shape. This is exactly the "post-bundle
steady state" the story declares it documents.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| STORY-39 (story-aecb7377, feature, status=reconciling) | BUNDLE-2 → REQ-3 + REQ-4 + REQ-6 | **aligned** — body documents the post-bundle steady-state contract; every claimed shape verified against the corresponding source ticket |

### Claim-by-claim verification (story body vs. intent)

| Story body claim | Intent source | Verdict |
|---|---|---|
| 9-role palette `bg, surface, surfaceSubtle, surfaceInverse, text, muted, primary, accent, border` | REQ-4 token table ("`text` replaces REQ-3's `fg`") | exact match |
| 9-step type scale `xs..5xl` + 5 weights + 3 line-heights + heading/body family | REQ-4 ("Adds `5xl`"; weights/lineHeights "New in REQ-4") | exact match |
| 10-step geometric spacing `0,1,2,3,4,6,8,12,16,24` | REQ-4 ("Replaces REQ-3's 7 named steps") | exact match |
| 5-step radius, 4-step shadow, 4-slot container (`narrow/default/wide/bleed`), 4-step breakpoints | REQ-4 token table | exact match |
| `ContentValue` = `string \| number \| boolean \| null \| AssetRef \| ContentValue[] \| { [key:string]: ContentValue }` | REQ-6 ("Site-schema widening") | verbatim match |
| `validateSite(input): Result<Site, ValidationError[]>` with JSON-pointer paths | REQ-3 Validator deliverable | aligned |
| Five nav patterns `in-page-anchors / top-tabs / top-tabs-dropdown / hamburger / footer-only` | REQ-3 `NavPattern` | aligned |
| Out-of-scope: catalog membership, token default values, file format | REQ-3 "Explicitly NOT in this ticket" | aligned |
| Mid-bundle intermediate shapes deliberately not captured (e.g. REQ-3's original `fg`, 8-step scale, `MarkdownString/UrlString/EnumValue` ContentValue) | Cumulative-intent rule (final reconciled state) | correct — documenting steady state, not retired intermediates |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | STORY-39 | — | Story body's ThemeTokens and ContentValue descriptions match REQ-4 and REQ-6 exactly; the explicit "contract evolves once across the bundle" narrative correctly attributes each widening to its source ticket | none |
| 2 | info | coverage | STORY-39 | — | The entire schema-contract surface of cumulative intent (REQ-3/4/6) is expressed by this single feature story; no schema ask from any bundle ticket is unrepresented | none |
| 3 | info | exclusivity | STORY-39 | — | Single story under the capability; no overlap possible | none |
| 4 | info | consistency | STORY-39 | — | Story elaborates REQ-3's bare "hex color" into `#rgb/#rrggbb/#rrggbbaa` and enumerates module-id/page-slug uniqueness rules. These are specificity-adding elaborations consistent with REQ-3's "structural validation rules" and the capability body's owned rules — not behavior intent fails to support | none |

## Notes for the Editor

No action required. This is a clean single-intent, single-story capability:

- **Consistency**: every shape in the story body traces to REQ-3, REQ-4,
  or REQ-6, verified line-by-line. The story even calls out its own
  evolution narrative ("REQ-3 introduced…, REQ-4 widened…, REQ-6
  widened…") and that narrative is accurate.
- **Coverage**: the cumulative schema intent is fully expressed by
  STORY-39. No reconciled/imminent ask is missing.
- **Exclusivity**: only one story; no duplication.
- The story correctly documents the **post-bundle steady state** and
  deliberately omits mid-bundle intermediate shapes (REQ-3's original
  `fg` palette key, 8-step scale, and `MarkdownString | UrlString |
  EnumValue` ContentValue). Per the cumulative-intent rule this is
  correct: the matrix should describe the current reconciled state, not
  retired intermediates. A future reader should NOT mistake the absence
  of `fg` / `MarkdownString` for drift — they were superseded within the
  same reconciled bundle by REQ-4 / REQ-6.
