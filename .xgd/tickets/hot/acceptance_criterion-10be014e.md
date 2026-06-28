---
uid: acceptance_criterion-10be014e
id: AC-629
type: acceptance_criterion
title: Successful conversion streams ordered progressive-reveal progress notifications
created_by: xgd
created_at: '2026-06-28T20:10:53.528988+00:00'
updated_at: '2026-06-28T20:10:53.528988+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
A successful conversion streams progress notifications to the builder for the
staged reveal: a screenshot-preview stage (carrying the desktop screenshot
reference when one exists), a theme-token stage (carrying the derived theme tokens
and a confidence band), and a digest-written stage (carrying the digest location,
page count, and asset count). The screenshot and theme stages are emitted before
the digest-written stage.

## Verification
Convert an analyzed, consented URL and capture the emitted progress events. Assert
a screenshot stage, a theme-token stage carrying applied tokens + confidence, and
a digest-written stage carrying the digest key and counts are all emitted, with
screenshot and theme preceding the digest-written event.
