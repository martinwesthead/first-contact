---
uid: report-05c464b3
id: REPORT-871
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-30T04:08:10.574962+00:00'
updated_at: '2026-06-30T04:08:10.574962+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-44f53d53
  plan_item_index: '1'
---

All 7 acceptance criteria are linked to the story. Plan item 1 is complete.

```
Story #1 created for reconciliation bundle-44f53d53

Story UID: STORY-69 (story-1e174b7c)
Title: Persistence schema for per-site chat sessions and the reference-doc library
Type: feature
Capability: CAP-53 (Chat & Reference-Doc Persistence) — newly created
Acceptance Criteria: 7 created (AC-793 … AC-799)

Progress: 1 of 5 plan items complete
```

**Summary of what was documented:**
- **AC-793** — chat session persists bound to one site, round-trips, site-scoped newest-activity-first list access path
- **AC-794** — append-only ordinal message sequence, duplicate-ordinal rejection, tail retrieval by ordinal
- **AC-795** — message full-text search stays consistent on insert/update/delete
- **AC-796** — message search is per-site scoped (no cross-site leakage)
- **AC-797** — cascade delete site → sessions → messages → search index
- **AC-798** — reference docs persist + FTS over title/summary/body + filter by kind
- **AC-799** — reversible migrations leave the accounts/sites/revisions (CAP-50) schema intact

Two non-behavioral intent→code divergences (migration numbering `005→0006` etc., and `*Record`/`*Parsed` type naming) were noted in the story's Technical Context for regression rather than absorbed into ACs. A new capability **CAP-53** was created because the existing CAP-50 is scoped to site-definition storage (accounts/sites/revisions) and chat/reference-doc persistence is a distinct bucket.
