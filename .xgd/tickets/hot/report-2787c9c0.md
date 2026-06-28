---
uid: report-2787c9c0
id: REPORT-661
type: report
title: Fix Public Site Delivery (ac) — attempt 1
created_by: xgd
created_at: '2026-06-28T19:51:12.478620+00:00'
updated_at: '2026-06-28T19:51:12.478620+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_structural_validation
  subject_uid: capability-474ee896
  level: ac
  fixes_applied: 3
  progress_made: true
  needs_more_work: false
  violations_remaining: 0
  anchor_report_uid: report-cda4212b
---

# Fix Summary — Public Site Delivery (ac)

**Attempt**: 1
**Fixes applied this call**: 3
**Violations remaining**: 0
**Needs more work**: false

All three findings in report-b34f270d (1 violation, 2 warnings) were matrix
coverage/consistency gaps against STORY-44's body. The implementation
(`apps/public-site/wrangler.toml` and the Worker) was confirmed correct, as the
assessor noted — no `code-issue` applies. All fixes are AC-level edits.

## Actions Taken — by Resolution Category

| # | Category | Element | Action |
|---|---|---|---|
| 1 | ac-add | AC-615 (new) | Created AC asserting `wrangler.toml` declares `[env.production.assets]` with `directory="./public"` and `binding="ASSETS"` matching the top-level `[assets]` block (closes finding 1, violation). story_uid=story-f632db8a, kind=behavior. |
| 2 | ac-add | AC-616 (new) | Created AC asserting `HEAD /` returns 200 from the Worker via the Static Assets binding (closes finding 2, warning). story_uid=story-f632db8a, kind=behavior. |
| 3 | ac-edit | AC-460 | Extended criterion + verification to assert the 404 response carries a `text/plain` content type (closes finding 3, warning). |

## Coverage After Edits

STORY-44 now has 10 ACs. The story body's "ASSETS binding in top-level AND
production-env" and "GET **and HEAD** delegated" in-scope bullets, previously
uncovered, are now each covered by a dedicated AC. AC-460 now matches the story
body's "plain-text 404" wording.

## Code Edits (if any)

None this call.

## needs_review Items Forwarded

None. All findings were actionable under their assigned resolution categories.

## Notes

- New ACs were placed alongside their sibling runtime/config ACs and follow the
  established conventions (kind=behavior, status=pending, story_uid linkage) and
  the verification style of AC-458 (`unstable_dev` harness) and AC-461 (config read).
- These ACs are not yet UAT-covered; if a level=uat phase follows, AC-615/AC-616
  will need tests authored next.
