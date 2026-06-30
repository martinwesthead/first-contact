---
uid: acceptance_criterion-256d5483
id: AC-794
type: acceptance_criterion
title: Chat messages are appended in a strictly increasing per-session ordinal sequence,
  duplicate ordinals are rejected, and the tail is retrievable by ordinal
created_by: xgd
created_at: '2026-06-30T04:06:57.637734+00:00'
updated_at: '2026-06-30T04:06:57.637734+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
Messages can be appended to a session, each carrying its session identifier, a
per-session ordinal position, a role, textual content, an optional structured
tool-call payload, and a timestamp. Two messages in the same session may not
share the same ordinal — an attempt to store a second message with an
already-used (session, ordinal) pair is rejected by the store. The most-recent
messages of a session can be retrieved in ordinal order using an access path
keyed by session identifier and ordinal, without scanning other sessions.

## Verification
Append several messages to a session and read them back ordered by ordinal,
asserting the stored fields round-trip. Attempt to insert a second message with
a duplicate (session, ordinal) pair and assert the write is rejected. Confirm a
tail query ordered by ordinal uses the session/ordinal index rather than a full
table scan.
