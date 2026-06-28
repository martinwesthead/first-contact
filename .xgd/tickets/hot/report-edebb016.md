---
uid: report-edebb016
id: REPORT-718
type: report
title: 'Capability-Intent Alignment: Site Definition Schema (level=ac)'
created_by: xgd
created_at: '2026-06-28T21:32:29.510606+00:00'
updated_at: '2026-06-28T21:32:29.510606+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-b7eebd2b
  level: ac
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Site Definition Schema
# Level: ac

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

The capability has a single story (STORY-39 / story-aecb7377, kind=feature,
status=reconciling) whose `intent_uid` is BUNDLE-2 (bundle-94e1d1b6,
status=free_and_reconciled, merged_at_commit 8ebe122e). The story body
attributes the schema's current shape to three source requirements inside
that bundle. Chronological ledger:

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | created 2026-06-15, completed 2026-06-25 | Reconciled the full schema bundle (REQ-1..REQ-8); merged at 8ebe122e | YES |
| REQ-3 (within BUNDLE-2) | bundled→reconciled | — | Introduced the initial `@1stcontact/site-schema` contract + `validateSite()` | YES |
| REQ-4 (within BUNDLE-2) | bundled→reconciled | — | Widened `ThemeTokens` to the locked superset (palette→9 roles, scale→9 steps + weights + lineHeights, spacing→10 geometric steps, container→4 slots) | YES |
| REQ-6 (within BUNDLE-2) | bundled→reconciled | — | Widened `ContentValue` to admit plain objects | YES |

Per the level cascade, the story-level cycle is assumed to have run first;
the STORY-39 body is the working reference for this AC-level check. The
story body is internally consistent (in-scope rules, out-of-scope boundary,
and the REQ-3/4/6 evolution note in Technical Context all agree), so no
escalation to intent history was required.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| AC-391 (minimal site validates + narrows to Site) | BUNDLE-2 / REQ-3 | aligned — follows from story §validateSite success branch |
| AC-392 (full site, every slot incl. NavEntry page/anchor/url) | BUNDLE-2 / REQ-3,4 | aligned — covers full type hierarchy + theme superset |
| AC-393 (module missing required field → JSON-pointer) | BUNDLE-2 / REQ-3 | aligned — required-shape rule |
| AC-394 (nav pattern outside 5-value enum rejected) | BUNDLE-2 / REQ-3 | aligned — matches story's five named nav patterns exactly |
| AC-395 (missing theme-token slot rejected) | BUNDLE-2 / REQ-4 | aligned — slot-completeness rule |
| AC-396 (non-hex palette value rejected) | BUNDLE-2 / REQ-3 | aligned — hex-color regex rule |
| AC-397 (catalog membership NOT validated) | BUNDLE-2 / REQ-3 | aligned — encodes the deliberate out-of-scope boundary as an AC |
| AC-398 (failure branch: ValidationError list, JSON-pointer, narrowing) | BUNDLE-2 / REQ-3 | aligned — matches §validateSite failure branch + RFC 6901 note |
| AC-399 (locked theme-token superset surface) | BUNDLE-2 / REQ-4 | aligned — slot list matches story body 1:1 |
| AC-400 (ContentValue: primitives/AssetRef/arrays/objects) | BUNDLE-2 / REQ-6 | aligned — recursive ContentValue shape incl. plain objects |
| AC-401 (duplicate module IDs within page rejected) | BUNDLE-2 / REQ-3 | aligned — module-id uniqueness rule |
| AC-402 (duplicate page slugs within site rejected) | BUNDLE-2 / REQ-3 | aligned — page-slug uniqueness rule |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | coverage | AC-392 | — | `SeoMeta` appears in the STORY-39 type-hierarchy list but is not explicitly named in AC-392's "every defined slot" fixture enumeration. It is semantically covered by the catch-all, and the story body defines no distinct validation rule for `SeoMeta` beyond general required-shape/primitive validation. Not a coverage gap. | Optionally name `SeoMeta` explicitly in AC-392's verification fixture so the full-site test demonstrably exercises it. |

### Consistency (each AC accurately reflects the story body)

All 12 ACs describe criteria that follow directly from the STORY-39 body.
Spot-checks of the highest-detail ACs confirm exact fidelity:
- AC-394's five nav patterns (`in-page-anchors`, `top-tabs`,
  `top-tabs-dropdown`, `hamburger`, `footer-only`) match the story body
  verbatim.
- AC-399's locked superset (palette 9 roles; typography family +
  9-step scale + 5 weights + 3 lineHeights; spacing 10 geometric steps
  `0,1,2,3,4,6,8,12,16,24`; radius 5; shadow 4; container 4; breakpoints 4)
  matches the story body's theme-token superset 1:1.
- AC-398's RFC 6901 `~0`/`~1` escape detail matches the story's Technical
  Context (JSON-pointer projection of `ZodIssue.path`).
No AC asserts behavior the story body does not support.

### Coverage (ACs collectively express the story's full surface)

Every in-scope behavior in the story body is covered (see mapping table in
the assessment): full type hierarchy, theme-token superset, recursive
ContentValue, validateSite success/failure contract with JSON pointers, and
all six structural validation rules (required shape, hex regex, slot
completeness, module-id uniqueness, page-slug uniqueness, nav-pattern enum).
The explicit out-of-scope boundary (catalog membership) is correctly encoded
as a documented AC (AC-397). The two remaining out-of-scope items (theme
default *values*, site-file format) correctly have no AC.

### Exclusivity (no two ACs cover the same criterion)

No duplicates. The closest pairs are intentionally distinct and
cross-reference each other:
- AC-399 (positive: superset slot surface accepted) vs AC-395 (negative:
  missing slot rejected) — AC-399 explicitly defers rejection to AC-395.
- AC-399 (slot presence/types) vs AC-396 (hex-string constraint on palette
  slots) — AC-399 explicitly defers hex validation to AC-396.

## Notes for the Editor

No action required for PASS. The single `info` item (AC-392 / `SeoMeta`) is
an opportunistic clarity improvement, not a drift repair — adopt only if the
AC tree is being touched for another reason. The capability's AC layer is a
clean, complete projection of the STORY-39 body, which is itself aligned to
the reconciled BUNDLE-2 intent (REQ-3/4/6).
