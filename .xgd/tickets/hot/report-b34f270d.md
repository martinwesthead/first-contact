---
uid: report-b34f270d
id: REPORT-660
type: report
title: 'Capability-Intent Alignment: Public Site Delivery (level=ac)'
created_by: xgd
created_at: '2026-06-28T19:47:21.022922+00:00'
updated_at: '2026-06-28T19:47:21.022922+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: capability_validation
  subject_uid: capability-474ee896
  level: ac
  violations: 1
  warnings: 2
  needs_review_count: 0
---

# Capability-Intent Alignment: Public Site Delivery
# Level: ac

**Result**: FAIL
**Violations**: 1
**Warnings**: 2
**Needs review**: 0

## Cumulative Intent Considered

This is an **ac-level** check: the story body is the working reference. STORY-44's
body is internally consistent and unambiguous, so no deep intent replay was required.
The originating intent is recorded for the ledger.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) | free_and_reconciled | merged @8ebe122e | Established the Phase 0 public-site delivery story (STORY-44) + AC tree | YES |

## Alignment Ledger

Capability **CAP-36 (capability-474ee896)** contains exactly one feature story:
**STORY-44 (story-f632db8a)**, `story_kind=feature`. ACs are evaluated against the
story body's six in-scope bullets.

Story in-scope surface → AC mapping:

| Story in-scope behavior | Covering AC | Outcome |
|---|---|---|
| Seven-module home page + in-page-anchors nav | AC-456 | aligned |
| Manrope/Inter typography + primary `#2563eb` / accent `#f59e0b` | AC-457 | aligned |
| Marketing site served (GET `/` → HTML) | AC-458 | aligned |
| Theme tokens served as CSS custom properties | AC-459 | aligned |
| Non-asset path → 404 | AC-460 | aligned (consistency note: plain-text not asserted) |
| ASSETS binding in **top-level AND production-env** wrangler config | — | **gap: no AC covers `[env.production.assets]`** |
| GET **and HEAD** delegated to ASSETS binding | AC-458 (GET only) | gap: HEAD uncovered |
| build/deploy/dryrun regenerate before downstream cmd | AC-461 | aligned |
| CI generate step before tests + dry-run deploy | AC-462 | aligned |
| Deploy generate step before `wrangler deploy` | AC-463 | aligned |

Exclusivity: AC-458/459/460 share the "GET against the Worker" shape but target
distinct paths/outcomes (HTML home, theme.css, 404); AC-461/462/463 cover the
generate step in three distinct surfaces (package scripts, CI workflow, deploy
workflow). No duplicate criteria.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | violation | coverage | STORY-44 (story-f632db8a) | ac-add | Story in-scope bullet requires the `ASSETS` binding "in both the top-level configuration **and the production environment configuration**" with the operator-persona guarantee that "production deploys serve the same generated tree as local dev"; technical context: "Both must point at the same `./public` directory". `apps/public-site/wrangler.toml` implements this (`[env.production.assets]` directory `./public` binding `ASSETS`), but **no AC verifies it**. Runtime ACs (AC-458/459/460) only exercise the top-level binding via `wrangler.unstable_dev`, leaving the production-env binding — central to the story title's "served end-to-end ... via Workers Static Assets" promise — unverified. | Add an AC asserting `wrangler.toml` declares `[env.production.assets]` with `directory="./public"` and `binding="ASSETS"` matching the top-level `[assets]` block. |
| 2 | warning | coverage | STORY-44 (story-f632db8a) | ac-add | Story body states twice that "GET **and HEAD** requests are delegated to the Static Assets binding" (in-scope bullet + technical context "non-form GET/HEAD requests"). No AC exercises HEAD. | Extend AC-458 or add an AC asserting `HEAD /` returns 200 from the Worker. |
| 3 | warning | consistency | AC-460 (acceptance_criterion-d455ff26) | ac-edit | Story specifies "any non-asset path (including unknown URLs) returns a **plain-text** 404 response"; AC-460's criterion/verification asserts only a 404 *status*, not the plain-text content type. | Extend AC-460 verification to assert the 404 response carries a `text/plain` content type. |

## Notes for the Editor

- Findings 1 and 2 are both coverage gaps where the public-site Worker's *serving
  contract* is under-specified at the AC level relative to the story body. They are
  related: an editor adding a "production-env binding configured" AC (finding 1) and
  a "HEAD delegated" AC (finding 2) closes the Worker-delivery surface.
- The implementation is correct in all three cases (verified `wrangler.toml`); these
  are **matrix coverage** gaps, not code bugs — no `code-issue` finding is warranted.
- Story body is internally consistent; no story-level escalation needed.
