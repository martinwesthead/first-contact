---
uid: acceptance_criterion-4f351a6b
id: AC-799
type: acceptance_criterion
title: 'Migrations are reversible: down migrations remove all chat and reference-doc
  schema objects while leaving the accounts/sites/revisions schema intact'
created_by: xgd
created_at: '2026-06-30T04:07:52.544251+00:00'
updated_at: '2026-06-30T04:07:52.544251+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
Applying the migrations creates the chat-session, chat-message, and
reference-doc tables together with their full-text search tables, access-path
indexes, and synchronization triggers. Running the corresponding down
migrations in reverse order removes every one of those schema objects, leaving
the data store with none of the chat/reference-doc tables, indexes, FTS tables,
or triggers — and with the pre-existing accounts, sites, and revisions schema
still present and unchanged.

## Verification
Apply all migrations and assert each chat/reference-doc table, FTS table,
index, and trigger exists. Run the down migrations in reverse order and assert
none of those objects remain, while the accounts/sites/revisions tables are
still present. Confirm no error is raised by the teardown.
