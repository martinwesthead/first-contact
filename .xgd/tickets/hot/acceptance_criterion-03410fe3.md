---
uid: acceptance_criterion-03410fe3
id: AC-728
type: acceptance_criterion
title: Convert evicts any prior digest before mechanical work so a re-run never serves
  stale data
created_by: xgd
created_at: '2026-06-29T21:46:03.507100+00:00'
updated_at: '2026-06-29T21:46:03.507100+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
Before performing any mechanical convert work, transcribe_site evicts any previously written transcription digest for the site (deletes `sites/{siteId}/transcription/digest.json` from the assets bucket). As a result, while a convert is mid-flight a read-back reports the not-ready status rather than the previous convert's digest, and a re-run never serves stale data from an earlier convert. Eviction happens up-front (Stage 0), before the new digest is built or written.

## Verification
Given a site that already has a stored digest, begin a convert and, before the new digest is written, invoke read-transcription-digest; assert it returns the `transcription_digest_not_ready` status (the prior digest is gone). Equivalently, assert the prior digest object at the digest key is deleted at the start of the convert.
