---
uid: acceptance_criterion-f456a07a
id: AC-797
type: acceptance_criterion
title: Deleting a site cascades to its chat sessions, their messages, and the message
  search index
created_by: xgd
created_at: '2026-06-30T04:07:35.172382+00:00'
updated_at: '2026-06-30T04:07:35.172382+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
Removing a site removes all of that site's chat sessions and, in turn, all of
those sessions' messages, with no orphaned sessions or messages left behind.
Removing a single session (without removing its site) removes that session's
messages. In both cases the message full-text search index is left consistent:
a search no longer returns content from the removed messages.

## Verification
Seed a site with one session and several messages. Delete the site and assert
the session count and message count for it drop to zero and a full-text search
for the removed content returns nothing. Separately, seed a session with
messages, delete only that session, and assert its messages are gone and absent
from search while the site remains.
