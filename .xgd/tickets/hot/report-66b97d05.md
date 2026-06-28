---
uid: report-66b97d05
id: REPORT-659
type: report
title: 'Capability-Intent Alignment: Public Site Delivery (level=story)'
created_by: xgd
created_at: '2026-06-28T19:43:14.214932+00:00'
updated_at: '2026-06-28T19:43:14.214932+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-474ee896
  level: story
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Public Site Delivery
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

This capability's only story (STORY-44, `story-f632db8a`) carries
`intent_uid = bundle-94e1d1b6` and no `updated_by` chain. The
capability ticket itself (CAP-36) has no `intent_uid`/`updated_by`
(created during reconcile of the bundle). So the cumulative intent
for CAP-36 derives from a single reconciled bundle.

| Intent ID | Status | When (merged commit) | Asked / changed (CAP-36-relevant slice) | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (`bundle-94e1d1b6`) | free_and_reconciled | merged_at_commit 8ebe122e | Bundles REQ-1…REQ-8 | YES |

CAP-36-relevant constituent REQs inside BUNDLE-2:

| REQ | CAP-36 slice | In CAP-36 scope? |
|---|---|---|
| REQ-1 | Monorepo scaffold; public-site Worker (placeholder); ci.yml/deploy.yml | Worker + CI/deploy ordering = YES; two-Worker pipeline in general = CAP-31 |
| REQ-2 | Rename `sites/first-contact/` → `sites/1stcontact/`; worker name `1stcontact-public-site` | YES (site dir + worker slug) |
| REQ-6 | `sites/1stcontact/site.json` (7-module Phase 0 page, theme); ASSETS binding (top-level + `[env.production.assets]`); GET/HEAD→ASSETS, 404 fallback; `generate` script; generate-before-deploy in ci.yml/deploy.yml | YES — core of CAP-36 |
| REQ-7 | Real `/api/forms/contact` handler, D1 leads, Turnstile, Resend | NO — Lead Capture Pipeline |
| REQ-3/4/5 | site-schema + framework modules | NO — CAP-32 / CAP-35 |
| REQ-8 | Builder SPA + chat proxy | NO — Builder UI / control-app |

The placeholder Worker behavior (REQ-1) was explicitly superseded
by REQ-6 (which deleted `test_UAT_FC_REQ-1_public_site_returns_placeholder`);
the cumulative intent therefore mandates the generated-output
serving behavior, NOT the placeholder.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| STORY-44 (`story-f632db8a`, feature, reconciling) | BUNDLE-2 (REQ-1, REQ-2, REQ-6) | aligned — body reflects every CAP-36-relevant behavior in the bundle; no retired behavior described; no active behavior omitted |

Per-claim trace of STORY-44 in-scope bullets → intent:

- Site definition under `sites/1stcontact/`, single `home` page,
  `nav.pattern: in-page-anchors`, 7-module order
  (header → hero → text-block landing → services-grid three-col →
  text-block prose → contact-form → footer), Manrope/Inter,
  primary `#2563eb`, accent `#f59e0b`, theme token superset
  → REQ-6 "sites/1stcontact/site.json" section (exact match);
  `sites/1stcontact/` path confirmed by REQ-2 rename. ✓
- ASSETS Static Assets binding in both top-level and production
  env config → REQ-6 "adds `[assets] directory=./public
  binding=ASSETS` at top level and under `[env.production.assets]`". ✓
- GET/HEAD delegated to ASSETS; non-asset path → plain-text 404
  → REQ-6 "All other GET/HEAD requests are delegated to the ASSETS
  Static Assets binding. Anything else (or asset 404) returns a
  plain-text 404." ✓
- `generate` script invokes generator against `sites/1stcontact`;
  build/deploy/dryrun generate first → REQ-6 "apps/public-site/
  package.json — adds a `generate` script … build/deploy/dryrun
  now generate first." ✓
- CI runs generate before tests + public-site dry-run → REQ-6
  ci.yml "same generate step before tests and the public-site
  dry-run." ✓
- Deploy runs generate before `wrangler deploy` → REQ-6
  deploy.yml "adds a 'Generate public-site static output' step
  before the wrangler deploy." ✓

Out-of-scope boundaries declared by STORY-44, cross-checked
against intent:

- Generator itself (CLI, validation, render, asset copy, font
  preloading) → assigned to STORY-43/CAP-35. Consistent: REQ-6's
  generator-behavior UATs belong to the generator capability. ✓
- `/api/forms/contact` handler, D1 leads, Turnstile, Resend →
  assigned to Lead Capture Pipeline. Consistent with REQ-7 (and
  the REQ-6 stub it replaces). ✓
- control-app, builder SPA, chat proxy → assigned to Builder UI.
  Consistent with REQ-8. ✓

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | STORY-44 | — | All six in-scope behavioral claims map 1:1 to REQ-6 (with REQ-1/REQ-2 for worker + `sites/1stcontact/` rename). No drift. | none |
| 2 | info | coverage | STORY-44 | — | BUNDLE-2 is the sole reconciled intent; its CAP-36 slice is fully expressed by the single feature story. No uncovered active behavior in CAP-36's scope. | none |
| 3 | info | exclusivity | STORY-44 | — | Single story in the capability; no intra-capability intent overlap is possible. | none |

## Notes for the Editor

- **Form-handler capability boundary (not a CAP-36 finding).**
  REQ-6 shipped a *stub* `POST /api/forms/contact` inside
  `apps/public-site/src/index.ts` (the same Worker CAP-36 owns),
  and REQ-7 replaces it with the real handler. STORY-44 cleanly
  assigns the entire form-handler behavior to the Lead Capture
  Pipeline story, keeping CAP-36 scoped to the GET/HEAD→ASSETS +
  404 branch of the Worker's fetch handler. This is a defensible
  matrix-organization split; the intent ledger specifies the
  form-handler behavior clearly (so it is NOT `needs_review`), it
  is simply owned by a different capability. If the Lead Capture
  Pipeline capability/story does not yet exist, the gap would be a
  coverage issue *for that capability*, not for CAP-36 — worth a
  glance during the Lead Capture capability's own alignment cycle.

- **Single-intent capability.** Because CAP-36 has exactly one
  reconciled intent and one story, future drift risk is low here;
  the most likely future drift vector is a later intent that
  changes the marketing page layout/theme or the CI/deploy
  ordering without updating STORY-44's body. No such intent exists
  in the ledger today.
