---
uid: acceptance_criterion-ad3de64a
id: AC-594
type: acceptance_criterion
title: Reference Digest conforms to a versioned schema enforced by a validator
created_by: xgd
created_at: '2026-06-27T01:11:05.942611+00:00'
updated_at: '2026-06-27T01:11:05.942611+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
The Reference Digest is a stable, versioned contract carrying `schemaVersion: 1`, `sourceUrl`, `fetchedAt`, `fetchPath` (`static | rendered`), `summary`, the five signal categories plus `assetInventory`, a `commentary` block (`perSection` map + `whatsMissing` list), and `screenshotKeys`. An exported validator accepts a well-formed digest and rejects one that violates the contract (e.g. wrong `schemaVersion`, missing required field, or an asset record with an out-of-range `kind`/`classification`), so downstream consumers can validate digests at their boundaries.

## Verification
Validate a fully-populated digest → assert it passes. Mutate copies to (a) set `schemaVersion` to a different number, (b) drop a required signal category, and (c) give an asset record an invalid `kind` → assert each is rejected by the validator.
