---
uid: report-fd48b8b4
id: REPORT-780
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-29T21:34:22.462898+00:00'
updated_at: '2026-06-29T21:34:22.462898+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-a3283461
---

All 9 UATs pass. Each AC is covered by exactly one test, named per the enforced `test_UAT_AC{N}_{desc}` convention, tested at the right boundary (real D1 via Miniflare for migrations/seed/uniqueness; the public slug functions for validation/reservation/suggestion), with no runtime code modified and no existing tests touched.

```
UATs generated for story story-a3283461 (plan item 1 of 7)

Story: story-a3283461
Test file(s) created:
  - tests/test_UAT_AC718_forward_migrations_create_tables_and_indexes.test.ts
  - tests/test_UAT_AC719_down_migrations_reverse_schema.test.ts
  - tests/test_UAT_AC720_bootstrap_seed_creates_account_site_revision.test.ts
  - tests/test_UAT_AC721_seeded_definitions_validate_as_site.test.ts
  - tests/test_UAT_AC722_duplicate_slug_insert_rejected.test.ts
  - tests/test_UAT_AC723_wellformed_slugs_accepted.test.ts
  - tests/test_UAT_AC724_malformed_slugs_rejected.test.ts
  - tests/test_UAT_AC725_reserved_slugs_rejected.test.ts
  - tests/test_UAT_AC726_slug_collision_suggestions_distinct_valid.test.ts

Tests written: 9
Tests passed: 9
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC718_forward_migrations_create_tables_and_indexes.test.ts"
  - "tests/test_UAT_AC719_down_migrations_reverse_schema.test.ts"
  - "tests/test_UAT_AC720_bootstrap_seed_creates_account_site_revision.test.ts"
  - "tests/test_UAT_AC721_seeded_definitions_validate_as_site.test.ts"
  - "tests/test_UAT_AC722_duplicate_slug_insert_rejected.test.ts"
  - "tests/test_UAT_AC723_wellformed_slugs_accepted.test.ts"
  - "tests/test_UAT_AC724_malformed_slugs_rejected.test.ts"
  - "tests/test_UAT_AC725_reserved_slugs_rejected.test.ts"
  - "tests/test_UAT_AC726_slug_collision_suggestions_distinct_valid.test.ts"
```

**AC → test mapping:**

| AC | Behavior | Boundary asserted |
|----|----------|-------------------|
| AC-718 | Forward migrations create tables + 4 indexes; UNIQUE on slug/email | `sqlite_master` catalog + CREATE-sql columns |
| AC-719 (regression) | Down migrations remove all REQ-10 tables/indexes | catalog absence after forward+down |
| AC-720 | Seed creates 1 account, 1 `1stcontact` site, 1 revision; published pointer set | row counts + cross-referenced ids |
| AC-721 | Seeded draft + published definitions validate as Site | `validateSite` on parsed payloads |
| AC-722 | Duplicate slug insert rejected, not persisted | D1 INSERT throws `/UNIQUE/i` + count=1 |
| AC-723 | Well-formed slugs accepted | `isValidSlug` |
| AC-724 | Malformed slugs (all categories) rejected | `isValidSlug` |
| AC-725 | Reserved slugs rejected, case-insensitive | `isReservedSlug` |
| AC-726 | ≥3 distinct, valid, non-reserved alternatives ≠ input | `suggestAlternativeSlug` |

One note for the reconcile review phase: the pre-existing `tests/test_UAT_FC_REQ-10_*` files (the free-coded originals these ACs were reconciled from) remain on disk. Per the FC orphan invariant, the downstream `reconciliation_review` / `check_fc_orphans` gate is responsible for renaming or deleting them — my scope was creating the AC-named UATs only, so I left them untouched.
