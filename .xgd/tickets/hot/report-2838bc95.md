---
uid: report-2838bc95
id: REPORT-472
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-25T00:39:43.862801+00:00'
updated_at: '2026-06-25T00:39:43.862801+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-94e1d1b6
  plan_item_index: '2'
---

Story and all acceptance criteria created.

```
Story #2 created for reconciliation bundle-94e1d1b6

Story UID: story-aecb7377
Title: site-schema: typed site contract + runtime validation
Type: feature
Acceptance Criteria: 11 created

Progress: 2 of 9 plan items complete
```

ACs:
- AC-391 — Valid minimal site validates and narrows to typed `Site`
- AC-392 — Valid full site exercising every slot validates
- AC-393 — Module instance missing required field rejected with JSON-pointer path
- AC-394 — Nav pattern outside the enum rejected
- AC-395 — Missing required theme-token slot rejected with the slot's JSON-pointer path
- AC-396 — Non-hex value in a palette color slot rejected
- AC-397 — Catalog membership NOT validated (module type/variant/dial are framework's concern)
- AC-398 — Validator returns `ValidationError` list with JSON-pointer paths on failure
- AC-399 — Theme tokens schema enforces the locked superset
- AC-400 — `ContentValue` admits primitives, `AssetRef`, arrays, and plain objects
- AC-401 — Duplicate module IDs within a page rejected
- AC-402 — Duplicate page slugs within a site rejected

New capability created: CAP-32 (capability-b7eebd2b) — Site Definition Schema.
