---
uid: report-eb355af2
id: REPORT-673
type: report
title: 'Fix UAT Coverage: Public Site Delivery — attempt 1'
created_by: xgd
created_at: '2026-06-28T20:13:46.323706+00:00'
updated_at: '2026-06-28T20:13:46.323706+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_uat_coverage
  subject_uid: capability-474ee896
  fixes_applied: 1
  progress_made: true
  needs_more_work: false
  violations_remaining: 0
  anchor_report_uid: report-cda4212b
---

# Fix UAT Coverage: Public Site Delivery

**Attempt**: 1
**Fixes applied**: 1
**Violations remaining**: 0
**Needs more work**: false

## Actions Taken — by Resolution Category

| # | Category | Element | Action |
|---|---|---|---|
| 1 | uat-edit | AC-460 (acceptance_criterion-d455ff26) | Added the missing content-type assertion to `test_UAT_AC460_get_unknown_path_returns_404` in `tests/test_UAT_AC458_AC459_AC460_public_site_worker_serves_generated_bundle.test.ts`: `expect(resp.headers.get("content-type") ?? "").toMatch(/^text\/plain/)` after the existing 404 status assertion. Ran the suite (vitest) — all 4 tests pass. Set AC-460 `uat_coverage=pass` and STORY-44 (story-f632db8a) `uat_coverage=pass`. |

## Detail

The single finding was a narrow under-assertion, exactly as categorized. AC-460's
criterion and verification spec require a 404 carrying a `text/plain` content type;
the worker (`apps/public-site/src/index.ts:31-34`) synthesizes
`new Response("Not found", { status: 404, "content-type": "text/plain; charset=utf-8" })`,
but the UAT asserted status only. A status-only assertion could not distinguish the
correct synthesis from the raw `ASSETS` 404, so the AC's defining dimension was
unproven.

The added assertion exercises the real Worker via `wrangler.unstable_dev` (already
the harness for this suite) against a freshly `runGenerate`-d bundle, and observes
the actual response header. Verified passing:

```
✓ tests/test_UAT_AC458_AC459_AC460_public_site_worker_serves_generated_bundle.test.ts (4 tests) 1604ms
  Test Files  1 passed (1)
       Tests  4 passed (4)
```

This same gap drove STORY-44's `fail` (its body promises a "plain-text 404
response"); the suite now proves the plain-text portion, so both the AC-460 and
STORY-44 verdicts are cleared. No new AC, no new test file, and no story-body edit
were needed — the story body, ACs, and implementation were already mutually
consistent, in agreement with the assessor's alignment ledger.

The legacy `tests/test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path.test.ts`
(also status-only) was left untouched: the report scoped the fix to the AC-460 test
("one added line on the existing AC-460 test closes it"), and that test is the one
bound to AC-460.

## Code Edits (if any)

None. Resolution was a single test-assertion edit (uat-edit); production code already
matched intent.

## needs_review Items Forwarded

None.

## Capability Verdict

Left `capability-474ee896.uat_coverage` for the assessor to re-check. With the only
violation resolved and both child verdicts now `pass`, the capability is expected to
pass on re-check.
