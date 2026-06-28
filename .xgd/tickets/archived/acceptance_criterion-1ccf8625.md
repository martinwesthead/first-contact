---
uid: acceptance_criterion-1ccf8625
id: AC-626
type: acceptance_criterion
title: Asserting site ownership at confirmation registers a per-origin robots override
created_by: xgd
created_at: '2026-06-28T20:10:25.466159+00:00'
updated_at: '2026-06-28T20:10:25.466159+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
When the operator records consent with the "I own this site" assertion set, a
robots override is registered for the source URL's origin, scoped to the chat
session, in addition to recording conversion consent. Recording consent without
the ownership assertion registers no robots override.

## Verification
Record consent for a URL with the ownership flag set; assert a robots override
exists for that URL's origin in the session. Record consent for another URL
without the flag; assert no override is registered for its origin.
