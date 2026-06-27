---
uid: report-4cc35ffd
id: REPORT-608
type: report
title: Fix Builder UI (ac) — attempt 1
created_by: xgd
created_at: '2026-06-27T00:58:26.663405+00:00'
updated_at: '2026-06-27T00:58:26.663405+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_structural_validation
  subject_uid: capability-6694c60f
  level: ac
  fixes_applied: 2
  progress_made: true
  needs_more_work: false
  violations_remaining: 0
  anchor_report_uid: report-cda4212b
---

# Fix Summary — Builder UI (ac)

**Attempt**: 1
**Fixes applied this call**: 2
**Violations remaining**: 0
**Needs more work**: false

Both findings in report-17695127 were `ac-add` coverage gaps — the story body (STORY-46 / story-ba9f2715) and existing ACs (AC-477..AC-487) were confirmed consistent, so no story-body-edit or ac-edit was needed (matching the assessor's "no story-body edit is needed" note). Each gap resolved by authoring a new acceptance_criterion linked to story-ba9f2715, modeled on the parallel existing AC.

## Actions Taken — by Resolution Category

| # | Category | Element | Action |
|---|---|---|---|
| 1 | ac-add | AC-585 (acceptance_criterion-287af37d) | Authored "Chat-turn history is persisted to browser storage and restored on builder re-mount". Resolves Finding 1 (violation): the chat-turn-history half of STORY-46's localStorage persistence promise, parallel to AC-485 (working-site-definition half). kind=behavior, story_uid=story-ba9f2715. |
| 2 | ac-add | AC-586 (acceptance_criterion-f503d328) | Authored "Starter site is fetched from same-origin at SPA boot, selected via ?site= with 1stcontact default". Resolves Finding 2 (warning): the SPA boot-fetch / `?site=` selection / `1stcontact` default path, complementing AC-477 (worker-serving side). kind=behavior, story_uid=story-ba9f2715. |

## Scope discipline

- AC-585 is scoped to chat-log persistence/restore only; it does not restate AC-485's working-site-definition guarantee — avoids an exclusivity overlap.
- AC-586 is scoped to the client boot-fetch + `?site=` selection + default; it does not restate AC-477's server-serving guarantee — the two are complementary, not duplicates.
- No conflict with the alignment ledger: both ACs trace directly to in-scope behaviors in STORY-46 that the assessor explicitly flagged as under-expressed at the AC layer.

## Code Edits (if any)

None this call.

## needs_review Items Forwarded

None — both findings were unambiguous `ac-add` and are resolved.

## Note for level=uat phase

Both new ACs have verification approaches written into their bodies but no UAT tests yet (uat_coverage unset). If a level=uat phase follows, AC-585 and AC-586 will each need a UAT exercising the real persistence/boot-fetch entry points.
