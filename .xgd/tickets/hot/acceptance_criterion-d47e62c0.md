---
uid: acceptance_criterion-d47e62c0
id: AC-719
type: acceptance_criterion
title: Down migrations reverse each forward migration, leaving the schema free of
  accounts/sites/revisions
created_by: xgd
created_at: '2026-06-29T21:28:16.406100+00:00'
updated_at: '2026-06-29T21:28:16.406100+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: true
---

## Criterion
Every forward migration has a corresponding down migration. After applying all forward migrations and then all down migrations (in reverse order) to a database, none of the REQ-10 objects remain: the `accounts`, `sites`, and `revisions` tables and their indexes are absent, and the seeded rows are gone.

## Verification
Apply forward migrations, then apply the down migrations, then query the schema catalog: assert the three tables and their indexes no longer exist. (Marked regression_only: it asserts the absence of objects, guarding reversibility against drift.)
