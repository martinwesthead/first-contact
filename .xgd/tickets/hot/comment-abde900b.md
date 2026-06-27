---
uid: comment-abde900b
id: COMMENT-196
type: comment
title: Claude response for fix_structural_validation report
created_by: xgd
created_at: '2026-06-27T00:58:36.409470+00:00'
updated_at: '2026-06-27T00:58:36.409470+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-4cc35ffd
  kind: note
---

Completion report filed (REPORT-608 / `report-4cc35ffd`).

## Summary — Fix Structural Validation: Builder UI (level=ac), attempt 1

Both findings in `report-17695127` were `ac-add` coverage gaps. The assessor's notes confirmed no story-body edit was needed — the STORY-46 body and existing ACs (AC-477..AC-487) are internally consistent; the drift was pure under-expression at the AC layer. I resolved both by authoring new acceptance criteria:

| Finding | Severity | Resolution | New AC |
|---------|----------|-----------|--------|
| 1 | violation | ac-add | **AC-585** — chat-turn history persisted to browser storage + restored on re-mount (the second half of STORY-46's localStorage promise, parallel to AC-485) |
| 2 | warning | ac-add | **AC-586** — starter site fetched same-origin at SPA boot, `?site=` selection, `1stcontact` default (the client-fetch path complementing AC-477's serving side) |

Both ACs are linked to `story-ba9f2715`, `kind: behavior`, scoped to avoid exclusivity overlaps with AC-485/AC-477.

**Completion fields**: `fixes_applied: 2`, `progress_made: true`, `needs_more_work: false`, `violations_remaining: 0` → the loop will hand control back to the assessor to verify. No `needs_review` items, no code edits. I flagged in the report that if a `level=uat` phase follows, both new ACs will each need a UAT exercising their real entry points (persistence store, SPA boot fetch).
