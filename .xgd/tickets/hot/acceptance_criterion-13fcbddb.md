---
uid: acceptance_criterion-13fcbddb
id: AC-804
type: acceptance_criterion
title: Reading messages with a before-cursor returns the page of older messages, chronological
created_by: xgd
created_at: '2026-06-30T04:16:23.351620+00:00'
updated_at: '2026-06-30T04:16:23.351620+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Reading a session's messages with a before-cursor returns the page of messages
whose ordinal is strictly less than the cursor, bounded by the limit, returned
in chronological (ascending ordinal) order. Repeated paging with the
oldest-returned ordinal as the next cursor walks backward through the
transcript without overlap or gaps.

## Verification
On a session with many messages, read with a before-cursor and assert every
returned message has an ordinal below the cursor, at most limit are returned,
and they are ascending. Page again using the new oldest ordinal and assert the
two pages are contiguous and non-overlapping.
