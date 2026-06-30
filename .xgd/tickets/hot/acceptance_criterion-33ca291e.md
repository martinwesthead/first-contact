---
uid: acceptance_criterion-33ca291e
id: AC-793
type: acceptance_criterion
title: A chat session persists bound to one site and is round-trippable, with a site-scoped
  newest-activity-first list access path
created_by: xgd
created_at: '2026-06-30T04:06:53.700983+00:00'
updated_at: '2026-06-30T04:06:53.700983+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
After the schema is applied, a chat session can be stored against a single site
and read back with all of its fields intact: a unique session identifier, the
owning site identifier, an optional owning-user identifier (may be absent), an
optional title (may be absent), creation and update timestamps, a
last-activity timestamp (may be absent), and a message count (defaulting to 0).
Sessions belonging to a given site can be retrieved ordered newest-activity-first
using an access path keyed by site identifier and last-activity timestamp
(descending), without scanning unrelated sites' sessions.

## Verification
Apply the migrations against a test data store; insert a session referencing a
seeded site; read the row back and assert each field matches what was written
(including a null user/title and the default message count). Issue a
site-scoped list query ordered by last-activity descending and confirm the
query plan uses the site/last-activity index rather than a full table scan.
