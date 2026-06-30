---
uid: acceptance_criterion-33cb28d2
id: AC-802
type: acceptance_criterion
title: Appending a message allocates a strictly increasing, gap-free per-session ordinal
  and updates session denormals atomically
created_by: xgd
created_at: '2026-06-30T04:16:02.846666+00:00'
updated_at: '2026-06-30T04:16:02.846666+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Appending a message to a session succeeds and returns the stored message,
including a server-allocated ordinal that is exactly one greater than the
previous highest ordinal in that session (strictly increasing, no gaps). After
the append, the session's message count reflects the new total and its
last-activity timestamp advances. Concurrent or sequential appends never reuse
an ordinal within a session.

## Verification
Append several messages to a session and assert their returned ordinals are
0,1,2,... contiguous with no gaps or duplicates. After appends, read the session
and assert message count equals the number appended and last-activity advanced.
