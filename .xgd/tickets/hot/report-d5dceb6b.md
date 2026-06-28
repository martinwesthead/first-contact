---
uid: report-d5dceb6b
id: REPORT-728
type: report
title: 'Capability-Intent Alignment: Platform Deployment Infrastructure (level=ac)'
created_by: xgd
created_at: '2026-06-28T21:46:52.939198+00:00'
updated_at: '2026-06-28T21:46:52.939198+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-8bfbe75a
  level: ac
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Platform Deployment Infrastructure
# Level: ac

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

The capability has one feature story (STORY-38, `story_kind=feature`,
status `reconciling`), whose `intent_uid` is BUNDLE-2
(bundle-94e1d1b6, status `free_and_reconciled`, merged at commit
`8ebe122e`). The bundle aggregates REQ-1..REQ-8; only the intents
that touch *this* capability's surface are listed below. REQ-3/4/5/7/8
deliver later capabilities (site-schema, framework, generator,
lead-capture, builder) and are explicitly scoped out by the story
body, so they impose no AC-coverage obligation here.

| Intent ID | Status | Asked / changed (this capability) | Counts? |
|---|---|---|---|
| REQ-1 | free_and_reconciled (BUNDLE-2) | Scaffold pnpm monorepo + two Worker apps; CI (PR validation) + CD (deploy on push to xgd-stable); placeholders for both Workers | YES |
| REQ-2 | free_and_reconciled (BUNDLE-2) | Rename identifiers `first-contact` → `1stcontact` across config surfaces | YES |
| REQ-6 | free_and_reconciled (BUNDLE-2) | Wired public-site to serve generated assets — superseded the public-site placeholder originally shipped by REQ-1 | YES (retires public-site placeholder) |
| REQ-3,4,5,7,8 | free_and_reconciled (BUNDLE-2) | Later capabilities (site-schema, framework, generator, lead-capture, builder) — out of scope for this story | YES, but not this capability's surface |

Level note: this is an `ac`-level check, so STORY-38's body is the
working reference (story-level alignment assumed correct). The story
body is internally consistent and self-documents the REQ-1→REQ-6
supersession and the REQ-2 rename, so intent history was consulted
only to confirm those two supersession/rename facts.

## Alignment Ledger

| Element | Story-body surface | Intents | Outcome |
|---|---|---|---|
| AC-384 control-app placeholder | Description bullet 3 | REQ-1, REQ-6 (retires public-site twin) | aligned — correctly asserts ONLY control-app; public-site placeholder retired by REQ-6 |
| AC-385 CI triggers + step order | Description bullet 4 | REQ-1 | aligned (info: asserts `workflow_dispatch` not enumerated in story body) |
| AC-386 deploy triggers + both Workers | Description bullet 5 | REQ-1 | aligned |
| AC-387 deploy concurrency per ref | Description bullet 5 | REQ-1 | aligned |
| AC-388 deploy credential injection | Description bullet 5 (deploy wiring) | REQ-1 | aligned (info: distinct from the out-of-scope secret *provisioning*) |
| AC-389 1stcontact slug alignment | Description bullet 6 | REQ-2 | aligned |
| AC-390 toolchain pinning | Description bullet 2 | REQ-1 | aligned |
| (none) monorepo workspace shape | Description bullet 1 | REQ-1 | gap (warning) — no dedicated AC; structural, indirectly exercised |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | coverage | STORY-38 (bullet 1: monorepo workspace shape) | ac-add | Story Description bullet 1 (pnpm-workspace monorepo + scaffolding for packages/, tools/generate, db/migrations/, tests/) has no dedicated AC. `apps/` and `sites/1stcontact/` are exercised indirectly (AC-386 deploys both Workers; AC-389 asserts `sites/1stcontact/`), but the broader workspace shape is not asserted. Borderline: ACs are `kind: behavior` and directory scaffolding is structural — a dedicated AC would be a structural existence check, which TEST-STRATEGY discourages. | Optional: if desired, add a behavioral AC asserting `pnpm-workspace.yaml` enumerates the workspaces and a workspace-wide build resolves all packages. Non-blocking. |
| 2 | info | consistency | AC-385 | — | AC-385 asserts the CI workflow accepts `workflow_dispatch`; the story body enumerates manual dispatch only for the *deploy* workflow (bullet 5), not CI (bullet 4). `workflow_dispatch` does not appear in the BUNDLE-2 narrative either. Benign extra trigger that falls under the story's "CI triggers" scope and reflects real code. | none |
| 3 | info | consistency | AC-388 | — | AC-388 asserts the deploy workflow injects `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` from GitHub secrets. The story's "Out of scope" excludes Cloudflare secret *provisioning* ("an operator task with no code"). These are distinct: provisioning the secret values (out of scope) vs. the workflow YAML `env:` wiring that references them (in scope, the surface AC-388 tests). No conflict. | none |
| 4 | info | consistency | AC-384 | — | AC-384 correctly asserts only the control-app placeholder `Hello from app.1stcontact.io`. The public-site placeholder originally shipped by REQ-1 was superseded by REQ-6; no AC asserts it, which is correct (retired behavior must not appear). | none |
| 5 | info | exclusivity | AC-385 + AC-390 | — | Both reference `--frozen-lockfile` install. Not a duplicate: AC-385 asserts CI trigger/step ordering (lockfile mentioned in passing as the install step), AC-390 asserts toolchain reproducibility (lockfile committed + both workflows install frozen). Different criteria, acceptable. | none |

## Notes for the Editor

- The AC tree is in good shape: every Description bullet except the
  monorepo-shape bullet maps cleanly to exactly one AC, with no
  contradictions against cumulative intent and no true duplicates.
- The single warning (finding #1) is deliberately non-blocking. The
  monorepo scaffolding is structural, not behavioral, and is already
  exercised indirectly. Adding a dedicated AC risks introducing a
  weak structural/existence test that TEST-STRATEGY warns against —
  only add one if a substantive behavioral assertion (e.g. a
  workspace-wide build resolving all packages) can back it.
- Two retirement/scoping decisions are handled correctly and should
  NOT be "fixed": (a) the public-site placeholder is absent because
  REQ-6 retired it; (b) Cloudflare secret provisioning is excluded
  while the workflow's secret-injection wiring (AC-388) is retained —
  these are different things, not a contradiction.
