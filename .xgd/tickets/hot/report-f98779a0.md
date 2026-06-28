---
uid: report-f98779a0
id: REPORT-674
type: report
title: 'UAT Coverage: Public Site Delivery'
created_by: xgd
created_at: '2026-06-28T20:15:42.625723+00:00'
updated_at: '2026-06-28T20:15:42.625723+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-474ee896
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Public Site Delivery

**Result**: PASS
**AC verdicts**: 10 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 1 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

CAP-36 has a single story (STORY-44) bound to a single intent — BUNDLE-2
(bundle-94e1d1b6), a `free_and_reconciled` bundle of REQ-1..REQ-8, merged at
commit 8ebe122. No later intent retires any behavior in this capability. Every
AC and the story body are supported by this one reconciled intent.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (REQ-1..REQ-8) | free_and_reconciled | 2026-06-25 (merged 8ebe122) | Monorepo + two Workers; public-site site definition, Static Assets delivery, generate-before-deploy ordering | YES |

No retirements. AC-615 (production assets block) and AC-616 (HEAD delegation)
were added in an earlier fix round; both document behavior the story body
already promised and the code already exhibits — aligned, not drift.

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-44 | BUNDLE-2 (REQ-1..REQ-8) | aligned | Body fully supported by reconciled intent; no stale/obsolete claims. Previous round's single coverage gap (plain-text 404) is now closed. |

## Findings — Categorized by Editor Action

None. The single violation from the prior round (REPORT-671: AC-460 under-asserted
its `text/plain` 404) was resolved by the fix loop (REPORT-673, fix_uat_coverage
attempt 1). No open findings remain.

## Notes for the Editor

Re-assessment after the fix loop. All 10 ACs now substantively covered via real
entry points, independently verified this round:

- **AC-456 / AC-457** — load the real committed `sites/1stcontact/site.json` and run real `validateSite`; assert exact seven-module order + in-page-anchors nav, and Manrope/Inter typography + `#2563eb`/`#f59e0b` palette.
- **AC-458 / AC-459 / AC-460 / AC-616** — run the real Worker via `wrangler.unstable_dev` against a freshly `runGenerate`-d bundle: GET 200 + doctype + `id="hero"` anchor; theme.css `--color-primary:#2563eb` + `--space-4`; **unknown-path 404 now asserting `Content-Type` ^`text/plain`** (the worker's distinguishing synthesis at `apps/public-site/src/index.ts`); HEAD 200.
- **AC-461** — inspects the real package scripts (generate `&&` downstream ordering) AND actually runs `runGenerate` into a temp dir verifying `index.html` + `assets/theme.css` appear.
- **AC-462 / AC-463** — parse the real `ci.yml` / `deploy.yml` and assert generate-step ordering; config ordering IS the behavior for these ACs, so YAML parsing is the correct substantive verification.
- **AC-615** — reads the real `wrangler.toml`, asserting both `[assets]` and `[env.production.assets]` declare `directory=./public` + `binding=ASSETS` and match.

Verification: `vitest run` on the worker-serving suite — 4/4 pass (1.16s), including
the augmented AC-460 assertion. Working tree clean; fix committed at 40c4ec57.
