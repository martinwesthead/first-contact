---
uid: report-fd0bcc07
id: REPORT-705
type: report
title: 'Capability-Intent Alignment: Framework Theme Tokens & CSS Generation (level=story)'
created_by: xgd
created_at: '2026-06-28T21:12:56.786132+00:00'
updated_at: '2026-06-28T21:12:56.786132+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-c64bb7c7
  level: story
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Framework Theme Tokens & CSS Generation
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

The capability's only story (STORY-40 / story-e53ba4cf) carries
`intent_uid = bundle-94e1d1b6` (BUNDLE-2) and no `updated_by` chain.
BUNDLE-2 is `free_and_reconciled` (merged at commit `8ebe122e`) and
bundles REQ-1..REQ-8. Two of those source intents touch the theme-token
surface; the rest concern other capabilities (scaffolding, schema,
modules, leads, builder).

| Intent ID | Status | When (bundle merge) | Asked / changed | Counts? |
|---|---|---|---|---|
| REQ-4 (in BUNDLE-2) | free_and_reconciled | commit 8ebe122e | Token→CSS generator (`generateThemeCss`), default-token set, optional dark `@media (prefers-color-scheme: dark)` block, and the deterministic kebab-cased CSS variable-name contract. Deferred the vetted Google Fonts shortlist to REQ-6 ("per-site choice, not a framework constant"). | YES |
| REQ-6 (in BUNDLE-2) | free_and_reconciled | commit 8ebe122e | Landed the vetted Google Fonts shortlist **in the framework theme surface** — `packages/framework/src/tokens/fonts.ts` (13 fonts; `VETTED_FONTS`, `findFontByFamilyDeclaration()`, `googleFontsHref()`) — superseding REQ-4's deferral. (Also tools/generate + marketing site, owned by other capabilities.) | YES |
| REQ-1,2,3,5,7,8 (in BUNDLE-2) | free_and_reconciled | commit 8ebe122e | Scaffolding, identifier rename, site-schema, content modules, lead pipeline, builder — no theme-token surface behavior. | N/A (other capabilities) |

**Cumulative picture for this capability:** the theme surface consists of
(1) a token→CSS generator emitting a `:root` block with one custom property
per locked slot using a fixed kebab-cased naming contract, (2) a published
default-token set, (3) an optional dark-palette `@media` override, and
(4) a vetted Google Fonts shortlist + family-declaration resolver + CSS2
URL builder. Item (4)'s home moved from "per-site (REQ-6 constant)" to
"framework theme tokens surface" within the same reconciled bundle; the
later reconciled intent (REQ-6's actual landing) is authoritative.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| STORY-40 (story-e53ba4cf) | REQ-4 (CSS generator, defaults, dark-mode block, variable-name contract, 55-token superset), REQ-6 (vetted fonts shortlist + resolver + CSS2 URL helper) | aligned — body fully and exclusively expresses the cumulative theme-token intent; in-scope/out-of-scope boundaries (module rendering, generator wiring, per-site font choices, token-value validation) match the intent ledger |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | STORY-40 (story-e53ba4cf) | — | STORY-40 places the vetted Google Fonts shortlist + helpers inside the framework theme surface. REQ-4 (free_and_reconciled) had deferred this as "a per-site choice, not a framework constant," but REQ-6 (free_and_reconciled, same bundle, authoritative because later) actually landed it at `packages/framework/src/tokens/fonts.ts`. The story correctly reflects REQ-6's final placement; the REQ-4 deferral note is superseded, not violated. | none |
| 2 | info | coverage | STORY-40 (story-e53ba4cf) | — | All four capability concerns (CSS generator, defaults, dark-mode override, fonts shortlist+helpers) are expressed in the single story; the 10-name variable contract matches REQ-4 verbatim and the 13-font count matches REQ-6 exactly. No intent-mandated theme behavior is missing. | none |
| 3 | info | exclusivity | STORY-40 (story-e53ba4cf) | — | Only one story under this capability; no intra-capability overlap possible. | none |

## Notes for the Editor

- The single apparent point of tension — fonts location — is a within-bundle
  intent evolution (REQ-4 deferred → REQ-6 landed in-framework), not drift.
  Both are `free_and_reconciled` at the same commit; the story and capability
  body track REQ-6's actual landing. No action required. If a future check
  re-surfaces this, the resolution is the same: REQ-6 is authoritative over
  REQ-4's deferral note for the fonts-placement decision.
- Module rendering, the module registry, chrome/content modules, and the
  static generator's CSS wiring are explicitly out of this capability's
  scope (separate framework capabilities) and the story body honors that
  boundary — no spillover to flag.

