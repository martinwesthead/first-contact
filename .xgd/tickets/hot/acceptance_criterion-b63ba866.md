---
uid: acceptance_criterion-b63ba866
id: AC-795
type: acceptance_criterion
title: Full-text search over chat message content stays consistent as messages are
  inserted, updated, and deleted
created_by: xgd
created_at: '2026-06-30T04:07:13.976115+00:00'
updated_at: '2026-06-30T04:07:13.976115+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
Chat message content is full-text searchable. A newly stored message becomes
findable by a term in its content; when a message's content is changed, the
search results reflect the new content and no longer match terms that were
removed; when a message is deleted, it no longer appears in search results. The
search index never returns rows that no longer exist in the message store.

## Verification
Insert a message and confirm a full-text query on a content term returns it.
Update the message's content and confirm the query matches the new term but not
the old. Delete the message and confirm the query returns no rows. Run these
against a migrated test data store on a single connection.
