---
uid: acceptance_criterion-15e93c46
id: AC-718
type: acceptance_criterion
title: Forward migrations create accounts, sites, and revisions tables with their
  indexes on a fresh database
created_by: xgd
created_at: '2026-06-29T21:28:13.771777+00:00'
updated_at: '2026-06-29T21:28:13.771777+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
Applying the platform's forward migrations to a fresh, empty database produces three tables — `accounts`, `sites`, `revisions` — each with the specified columns, and the declared indexes (`sites` indexed by account and by slug; `revisions` indexed by site and by site+published-time). The `sites.slug` column carries a UNIQUE constraint and the `accounts.email` column carries a UNIQUE constraint.

## Verification
On a fresh database, apply all migrations and query the schema catalog: assert the three tables exist with the expected columns, and that the four named indexes exist. A test reading the schema can assert each table/index by name.
