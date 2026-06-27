---
uid: acceptance_criterion-18da41c8
id: AC-608
type: acceptance_criterion
title: Convert this site emits a digest-convert event; Discard collapses the card
created_by: xgd
created_at: '2026-06-27T01:26:18.514829+00:00'
updated_at: '2026-06-27T01:26:18.514829+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
The Digest Report card presents two actions. Activating "Convert this site" emits a `fc:digest-convert-requested` event carrying the digest (and its markdown) in the event detail. Activating "Discard" collapses the card body without emitting a convert event.

## Verification
Render the card, register a listener for `fc:digest-convert-requested`, click "Convert this site" and assert the event fires with `detail.digest` matching the rendered digest. Click "Discard" and assert the card body is collapsed and no convert event fired.
