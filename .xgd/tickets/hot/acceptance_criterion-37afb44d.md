---
uid: acceptance_criterion-37afb44d
id: AC-649
type: acceptance_criterion
title: Content-addressed key is deterministic so re-mirroring a URL is idempotent
created_by: xgd
created_at: '2026-06-28T20:40:27.686562+00:00'
updated_at: '2026-06-28T20:40:27.686562+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-5d1952ba
  kind: behavior
  regression_only: false
---

## Criterion
The storage key for an asset is a deterministic function of the source URL (and site id): the same URL always produces the same 16-character content hash and therefore the same key. Mirroring the same URL twice targets the same key, overwriting it with the same bytes rather than creating a second object — making convert re-runs safe with no rollback.

## Verification
Compute the content hash and the storage key for the same URL twice and assert both pairs are equal. Mirror the same URL into the same site twice and assert the bucket holds a single object at the shared key after both calls.
