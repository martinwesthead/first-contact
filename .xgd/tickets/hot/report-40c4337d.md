---
uid: report-40c4337d
id: REPORT-731
type: report
title: 'UAT Coverage: Platform Deployment Infrastructure'
created_by: xgd
created_at: '2026-06-28T21:55:57.276306+00:00'
updated_at: '2026-06-28T21:55:57.276306+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-8bfbe75a
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Platform Deployment Infrastructure

**Result**: PASS
**AC verdicts**: 7 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 1 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

All story-relevant intent rides in BUNDLE-2 (bundle-94e1d1b6), status
`free_and_reconciled`, merged at commit `8ebe122e`. Counts toward
cumulative intent. The story-relevant source tickets within the bundle:

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| REQ-1 | free_and_reconciled | 2026-06-25 | Scaffold pnpm monorepo + two Cloudflare Workers; CI (PR install/build/test/dry-run) + deploy (push to xgd-stable, both Workers to prod, concurrency, CF secrets); toolchain pinning (Node 20+/pnpm 9+/frozen lockfile). Originally included a public-site placeholder. | YES |
| REQ-2 | free_and_reconciled | 2026-06-25 | Rename `first-contact` → `1stcontact` slug across root package name, both wrangler worker names, `sites/` dir, CLAUDE.md heading. Folded into this story as ACs. | YES |
| REQ-6 | free_and_reconciled | 2026-06-25 | public-site began serving generated static assets, superseding the REQ-1 public-site placeholder; its UAT was deleted. Added a "Generate public-site static output" step to both workflows (owned by the Public Site Worker story). | YES (retired the public-site placeholder) |

**Net cumulative intent for this capability**: control-app placeholder
(still the fallback) + CI/deploy triggers and ordering + per-ref deploy
serialization + Cloudflare credential injection (deploy only) + slug
alignment + toolchain pinning. The public-site placeholder is RETIRED
and is correctly absent from this story's ACs (it has no AC to deprecate).

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-38 | REQ-1, REQ-2, REQ-6 | aligned | Body documents the REQ-1→REQ-6 public-site supersession in Technical Context and lists it under "Out of scope". Generate step explicitly delegated to the Public Site Worker story. No stale claims. |

## Findings — Categorized by Editor Action

None. Zero violations, zero warnings, zero needs_review.

| # | Severity | Level | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| — | — | — | — | — | (none) | — |

## Evidence Summary (per AC)

| AC | Behavior | Test | Verdict | Why substantive |
|---|---|---|---|---|
| AC-384 | control-app placeholder at `/` | test_UAT_AC384 | pass | Boots the real Worker via `unstable_dev`, fetches `/`, asserts 200 + exact body + `text/plain`. Real entry point. |
| AC-385 | CI triggers + step order | test_UAT_AC385 | pass | Parses `ci.yml` (structured YAML), asserts `pull_request.branches` = {main,xgd-working,xgd-stable}, `workflow_dispatch`, and install→build→test→dry-run ordering. |
| AC-386 | deploy triggers + both Workers | test_UAT_AC386 | pass | Parses `deploy.yml`, asserts push branch xgd-stable, both `wrangler deploy --env production` steps, install→build→deploy ordering. |
| AC-387 | per-ref deploy serialization | test_UAT_AC387 | pass | Asserts `concurrency.group` references `github.ref` and `cancel-in-progress` is not true (queues rather than cancels). |
| AC-388 | CF credentials (deploy only) | test_UAT_AC388 | pass | Asserts deploy job env sources both secrets; strong negative — confirms CI workflow exposes neither (top env, job env, step env, raw text). |
| AC-389 | 1stcontact slug everywhere | test_UAT_AC389 | pass | Reads package.json name, both wrangler names, sites dir, CLAUDE.md heading; negative greps each surface for `first-contact`. |
| AC-390 | toolchain pinning | test_UAT_AC390 | pass | Asserts engines.node ≥20, packageManager pnpm@9.x, lockfile present, both workflows install with `--frozen-lockfile`. |

All 7 tests executed green (`pnpm test`, 7/7 passing, 1.35s).

## Notes for the Editor

Nothing to fix. This capability is exemplary on the drift dimension:
the story body proactively records the REQ-1→REQ-6 supersession instead
of leaving a stale placeholder claim, and cleanly delegates the generate
step to the Public Site Worker story rather than asserting it here. The
config-validation ACs (385–390) are correctly tested by parsing the
actual workflow/manifest artifacts under test — for CI/CD config there
is no runtime to invoke, so structured-YAML assertion of trigger/ordering/
env fields is the substantive evidence, not mere naming.
