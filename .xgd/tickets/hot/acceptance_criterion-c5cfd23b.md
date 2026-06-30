---
uid: acceptance_criterion-c5cfd23b
id: AC-806
type: acceptance_criterion
title: Deleting a session cascades message removal, sweeps referenced R2 attachments,
  and reports swept keys
created_by: xgd
created_at: '2026-06-30T04:16:48.944779+00:00'
updated_at: '2026-06-30T04:16:48.944779+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Deleting an existing session succeeds: the session and all its messages are
removed (a subsequent read of the session and its messages no longer find them),
and any attachment objects in blob storage that are referenced by attachment
keys recorded in the session's stored tool-call data are deleted. The response
reports the set of swept attachment keys. Deleting a session that does not exist
is rejected as not-found.

## Verification
Append a message whose tool-call data references an attachment key, store an
object at that key, then delete the session. Assert the session and messages are
gone, the referenced attachment object is removed from blob storage, and the
response lists the swept key. Delete a non-existent session and assert a
not-found response.
