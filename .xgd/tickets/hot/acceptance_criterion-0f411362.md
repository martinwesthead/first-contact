---
uid: acceptance_criterion-0f411362
id: AC-803
type: acceptance_criterion
title: Reading a session's messages with no cursor returns the most-recent page in
  chronological order
created_by: xgd
created_at: '2026-06-30T04:16:19.524533+00:00'
updated_at: '2026-06-30T04:16:19.524533+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Reading a session's messages without a cursor returns the most recent page of
messages (bounded by a default page size, overridable by a limit) in
chronological order (ascending ordinal, oldest-of-the-page first). When the
session has fewer messages than the page size, all of them are returned in
ascending order.

## Verification
Append more messages than the default page size, then read with no cursor and
assert the returned set is the newest page, ordered by ascending ordinal. Read a
short session and assert all messages return in ascending order.
