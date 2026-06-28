---
uid: report-d60f888c
id: REPORT-729
type: report
title: 'Capability-Intent Alignment: Platform Deployment Infrastructure (level=uat)'
created_by: xgd
created_at: '2026-06-28T21:51:32.357756+00:00'
updated_at: '2026-06-28T21:51:32.357756+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-8bfbe75a
  level: uat
  violations: 0
  warnings: 3
  needs_review_count: 0
---

# Capability-Intent Alignment: Platform Deployment Infrastructure
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 3
**Needs review**: 0

## Cumulative Intent Considered

The single story under this capability (STORY-38, `feature`,
`reconciling`) is anchored to one reconciled intent bundle.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6 — REQ-1…REQ-8) | free_and_reconciled | 2026-06-25 (commit 8ebe122e) | REQ-1 scaffolded the monorepo + two Workers + CI/deploy pipeline (orig. public-site + control-app placeholders); REQ-2 renamed slug `first-contact`→`1stcontact`; REQ-6 superseded the public-site placeholder by serving generated assets (its UAT deleted) | YES |

UAT-level note: at this level ACs are the working reference. The
intent ledger is consulted only to confirm the story body's two
documented supersessions are real — both resolved within the same
reconciled bundle, so no live behaviour is mis-asserted:
- REQ-1 public-site placeholder → retired by REQ-6; the matrix
  correctly asserts only the control-app placeholder (AC-384).
- REQ-2 slug rename → folded into AC-389 as configuration alignment,
  not a separate capability. No `first-contact` slug remains in the
  named surfaces (verified by grep).

## Alignment Ledger

Each active AC maps 1:1 to a substantive AC-numbered UAT that
exercises real entry points (booting the control-app Worker via
`unstable_dev`, or parsing the real workflow/config YAML — the
verification shape each AC itself prescribes).

| Element (AC) | UAT | Outcome |
|---|---|---|
| AC-384 control-app serves placeholder at `/` | test_UAT_AC384_control_app_serves_placeholder | aligned — boots real Worker, asserts 200 / `Hello from app.1stcontact.io` / `text/plain` |
| AC-385 CI triggers on PRs + ordered steps | test_UAT_AC385_ci_workflow_triggers_and_steps | aligned — parses real ci.yml; asserts pull_request branches {main, xgd-working, xgd-stable}, workflow_dispatch, install→build→test→dry-runs order |
| AC-386 deploy on push to xgd-stable, both Workers | test_UAT_AC386_deploy_workflow_triggers_and_deploys | aligned — parses real deploy.yml; push branch xgd-stable, workflow_dispatch, install→build→public deploy→control deploy, both `--env production` |
| AC-387 deploy serializes per ref | test_UAT_AC387_deploy_workflow_concurrency_per_ref | aligned — asserts top-level `concurrency.group` incorporates `github.ref` and `cancel-in-progress` is not true (queues, not cancels) |
| AC-388 deploy injects CF creds, CI does not | test_UAT_AC388_deploy_workflow_injects_cloudflare_credentials | aligned — deploy job env sources both creds from `secrets.*`; asserts CI workflow injects neither at top/job/step env nor references the secrets |
| AC-389 identifiers aligned to 1stcontact slug | test_UAT_AC389_identifiers_aligned_to_1stcontact_slug | aligned — checks root pkg name, both wrangler names, sites/1stcontact dir, CLAUDE.md heading; asserts no `first-contact` in any surface |
| AC-390 toolchain pinned + frozen lockfile | test_UAT_AC390_toolchain_pinned_node_pnpm_lockfile | aligned — asserts engines.node ≥20, packageManager pnpm@9.x, pnpm-lock.yaml present, both workflows install with `--frozen-lockfile` |

All production surfaces referenced by the UATs exist
(`apps/control-app/src/index.ts`, both `wrangler.toml`,
`.github/workflows/{ci,deploy}.yml`, `package.json`,
`pnpm-lock.yaml`, `sites/1stcontact/`), so coverage is real
evidence rather than tests over absent code.

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | exclusivity | test_UAT_FC_REQ-1_control_app_returns_placeholder vs test_UAT_AC384_control_app_serves_placeholder | uat-edit (remove duplicate) | Pre-reconciliation free-coded UAT verifies the SAME scenario in the SAME shape (boot control-app via `unstable_dev`, GET `/`, assert 200 / `Hello from app.1stcontact.io` / text/plain) as the reconciled AC-384 UAT | Delete the superseded `FC_REQ-1` placeholder test; AC-384 is the matrix UAT of record |
| 2 | warning | exclusivity | test_UAT_FC_REQ-1_ci_workflow_lints vs test_UAT_AC385_ci_workflow_triggers_and_steps | uat-edit (remove duplicate) | FC UAT parses ci.yml and asserts a subset of AC-385 (pull_request trigger, dryrun:public/control, pnpm test) in the same YAML-parse shape — fully subsumed by AC-385 | Delete the superseded `FC_REQ-1` ci test; AC-385 covers it (and more: branch list, workflow_dispatch, step ordering) |
| 3 | warning | exclusivity | test_UAT_FC_REQ-1_deploy_workflow_lints vs test_UAT_AC386 / AC-387 / AC-388 | uat-edit (remove duplicate) | FC UAT parses deploy.yml and asserts push→xgd-stable, concurrency group, both CF secrets, wrangler deploy of both Workers — the union is fully covered by the reconciled AC-386/387/388 UATs in the same shape | Delete the superseded `FC_REQ-1` deploy test; AC-386/387/388 are the matrix UATs of record |

## Notes for the Editor

- These are cleanup-only warnings, not drift: the matrix UATs
  (AC-384…AC-390) correctly and fully express cumulative intent.
  The three `FC_REQ-1_*` tests are the original free-coded evidence
  that reconciliation formalized into AC-numbered UATs; per the
  codebase-hygiene "orphaned files" rule they should be deleted now
  that their AC-numbered successors exist. They are harmless (assert
  correct behaviour) but redundant, so they do not block uat-level
  pass.
- Two minor, non-blocking observations (no finding): AC-385's UAT
  asserts `test < public-dry-run` and `test < control-dry-run` but
  not an ordering between the two dry-runs; AC-385/386 UATs
  deliberately do NOT assert the `Generate public-site static output`
  step — correct, since that step is owned by the Public Site Worker
  story (covered by AC-462/AC-463), not this capability.
- needs_review: none. The two supersessions the story body relies on
  (REQ-1 public-site placeholder retired by REQ-6; REQ-2 slug rename
  folded into ACs) are both resolved inside the same reconciled
  bundle — the ledger is not silent or ambiguous on any asserted
  behaviour.
