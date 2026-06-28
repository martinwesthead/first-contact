---
uid: report-84ed21a6
id: REPORT-671
type: report
title: 'UAT Coverage: Public Site Delivery'
created_by: xgd
created_at: '2026-06-28T20:09:17.918653+00:00'
updated_at: '2026-06-28T20:09:17.918653+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-474ee896
  violations: 1
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Public Site Delivery

**Result**: FAIL
**AC verdicts**: 9 pass, 1 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 0 pass, 1 fail, 0 stale, 0 needs_review
**Capability verdict**: fail

## Cumulative Intent Considered

CAP-36 has a single story (STORY-44) bound to a single intent — BUNDLE-2
(bundle-94e1d1b6), a `free_and_reconciled` bundle of REQ-1..REQ-8, merged at
commit 8ebe122. No later intent retires any behavior in this capability.
Every AC and the story body are supported by this one reconciled intent.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (REQ-1..REQ-8) | free_and_reconciled | 2026-06-25 (merged 8ebe122) | Scaffolds monorepo + two Workers; public-site site definition, Static Assets delivery, generate-before-deploy ordering | YES |

No retirements. AC-615 (production assets block) and AC-616 (HEAD delegation)
were added in the prior fix round; both are reconciliation-style ACs that
document behavior the story body already promised and the code already exhibits
— aligned, not drift.

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-44 | BUNDLE-2 (REQ-1..REQ-8) | aligned | Story body fully supported by reconciled intent; no stale/obsolete claims. Coverage gap only — not a body-drift issue. |

## Findings — Categorized by Editor Action

| # | Severity | Level | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | violation | uat | AC-460 | uat-edit | AC-460 requires a 404 **carrying a `text/plain` content type**; its verification spec mandates asserting `Content-Type` begins with `text/plain`. The test (`test_UAT_AC460_get_unknown_path_returns_404` in `tests/test_UAT_AC458_AC459_AC460_public_site_worker_serves_generated_bundle.test.ts`) asserts only `resp.status === 404`. The legacy `tests/test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path.test.ts` also asserts status only. The worker's *only* custom marketing-path behavior is synthesizing `new Response("Not found", { status: 404, "content-type": "text/plain; charset=utf-8" })` (`apps/public-site/src/index.ts`). A status-only test passes even if that synthesis is removed and the raw `ASSETS` 404 (different/absent content-type) is returned — so it cannot distinguish the correct implementation from an incorrect one on the AC's defining dimension. | In `test_UAT_AC460_*`, add `expect(resp.headers.get("content-type") ?? "").toMatch(/^text\/plain/)` after the status assertion. |

## Notes for the Editor

This is a single, narrow under-assertion — not a structural or intent problem.
The story body, the ACs, and the implementation are all correct and mutually
consistent; the only gap is that the negative-path test under-asserts relative
to AC-460's own verification spec. One added line on the existing AC-460 test
closes it (no new AC, no new test file, no story-body edit needed).

The story-level `fail` verdict is driven entirely by this same gap: STORY-44's
body explicitly promises "any non-asset path (including unknown URLs) returns a
**plain-text** 404 response," and the suite does not currently prove the
plain-text portion. Fixing finding #1 resolves both the AC-460 and STORY-44
verdicts.

All other ACs substantively cover their behavior with real entry points:
- AC-456 / AC-457 load the real committed `sites/1stcontact/site.json` and run real `validateSite`, asserting exact module order/nav and typography/palette.
- AC-458 / AC-459 / AC-616 run the real Worker via `wrangler.unstable_dev` against a freshly `runGenerate`-d bundle (GET 200 + doctype + anchors; theme.css tokens; HEAD 200).
- AC-461 inspects the real package scripts (generate `&&` downstream ordering) AND actually runs `runGenerate` into a temp dir verifying outputs appear.
- AC-462 / AC-463 parse the real `ci.yml` / `deploy.yml` and assert generate-step ordering — config ordering IS the behavior for these ACs, so YAML parsing is the correct substantive verification, not a structural cheat.
- AC-615 reads the real `wrangler.toml` and asserts both `[assets]` and `[env.production.assets]` blocks declare `directory=./public` + `binding=ASSETS` and match.
