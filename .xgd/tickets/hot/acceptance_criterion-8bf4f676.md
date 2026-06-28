---
uid: acceptance_criterion-8bf4f676
id: AC-628
type: acceptance_criterion
title: Converting a never-analyzed URL fails cleanly with a digest-not-found error
created_by: xgd
created_at: '2026-06-28T20:10:50.572684+00:00'
updated_at: '2026-06-28T20:10:50.572684+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Triggering a convert for a source URL that has not been analyzed (no Reference
Digest available) fails cleanly with an error indicating the digest was not found,
and performs no draft mutation and no asset mirroring. The error directs the
operator to analyze the page first.

## Verification
Invoke the convert action for a URL with no analyzed digest available. Assert the
result is a failure whose error contains "digest_not_found", and that the working
draft is unchanged.
