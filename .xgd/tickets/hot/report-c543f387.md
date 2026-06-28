---
uid: report-c543f387
id: REPORT-664
type: report
title: 'Capability-Intent Alignment: Public Site Delivery (level=ac)'
created_by: xgd
created_at: '2026-06-28T19:53:59.176995+00:00'
updated_at: '2026-06-28T19:53:59.176995+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-474ee896
  level: ac
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Public Site Delivery
# Level: ac

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

The capability (CAP-36) has a single feature story, STORY-44, whose `intent_uid`
is BUNDLE-2 (the only intent that has touched this capability's tree).

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged @ 8ebe122e | Bundles REQ-1..REQ-8 (monorepo scaffold + two-Worker deploy pipeline + Phase 0 marketing site). The Public Site Delivery slice: real 1stcontact site definition, public-site Worker serving via Workers Static Assets, generate-before-deploy/CI ordering. | YES |

At `ac` level the cascade makes STORY-44's body the working reference (story-level
alignment ran first). The story body is internally consistent and unambiguous, so
intent history was not consulted beyond confirming the single reconciled bundle —
no upper-layer ambiguity forced a deeper walk.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| AC-456 (seven-module home page, in-page-anchors nav) | BUNDLE-2 | aligned — matches story "single `home` page ... seven-module layout ... nav.pattern: in-page-anchors" |
| AC-457 (Manrope/Inter typography, primary/accent palette) | BUNDLE-2 | aligned — matches story typography/palette spec (#2563eb / #f59e0b) |
| AC-458 (GET / → 200 generated HTML w/ module anchors) | BUNDLE-2 | aligned — matches "GET ... delegated to the Static Assets binding" |
| AC-459 (GET /assets/theme.css → 200 theme tokens) | BUNDLE-2 | aligned — matches theme-token superset / asset delivery |
| AC-460 (GET unknown path → plain-text 404) | BUNDLE-2 | aligned — matches "any non-asset path ... returns a plain-text 404" |
| AC-461 (build/deploy/dryrun regenerate first) | BUNDLE-2 | aligned — matches "app's build, deploy, and dry-run scripts run that generate step first" |
| AC-462 (CI generate before tests + dry-run) | BUNDLE-2 | aligned — matches "CI workflow runs a generate step before the test run and the dry-run deploy" |
| AC-463 (deploy generate before wrangler deploy) | BUNDLE-2 | aligned — matches "deploy workflow runs the same generate step before invoking wrangler deploy" |
| AC-615 (ASSETS binding in production env AND top level) | BUNDLE-2 | aligned — matches "ASSETS binding ... in both the top-level configuration and the production environment configuration"; AC verification asserts BOTH blocks point at ./public |
| AC-616 (HEAD / → 200 via Static Assets binding) | BUNDLE-2 | aligned — matches "GET and HEAD requests are delegated to the Static Assets binding" |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | coverage | AC-456 | ac-edit | Story body states the contact-form module declares `action: "/api/forms/contact"` and explicitly scopes that the marketing site definition "includes the contact-form module pointing at that action URL" (the documented seam to the Lead Capture Pipeline story). AC-456 asserts the contact-form module's presence and order but not its `action` value; no other AC (AC-458 included) asserts the action URL. | Extend AC-456's verification to assert the contact-form module instance carries `action = "/api/forms/contact"`. |

## Notes for the Editor

- This is the second alignment cycle (previous_attempt_count=1). The prior fix
  attempt added AC-615, AC-616 and edited AC-460; those edits are sound and close
  the gaps they targeted. AC-615 in particular now correctly asserts BOTH the
  top-level `[assets]` block and the `[env.production.assets]` block (the
  production env does not inherit the top-level block), which fully covers the
  story's "in both ... configurations" requirement — no separate top-level AC is
  needed because the GET/HEAD UATs (AC-458/459/460/616) exercise the top-level
  binding via the dev harness while AC-615 statically guarantees the production
  block.
- GET (AC-458), HEAD (AC-616), asset (AC-459), and unknown-path (AC-460) ACs are
  distinct scenarios, not exclusivity duplicates.
- The standalone `generate` script and "theme token superset" are covered
  transitively (AC-461 proves generation runs; AC-457/AC-459 assert representative
  tokens) — no additional AC required.
- The single warning is opportunistic and does not block the level.

