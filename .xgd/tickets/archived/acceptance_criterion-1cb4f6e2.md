---
uid: acceptance_criterion-1cb4f6e2
id: AC-663
type: acceptance_criterion
title: Confirming the conversion (ownership unchecked) signals proceed with ownsSite=false
  and collapses the card
created_by: xgd
created_at: '2026-06-28T20:55:18.726937+00:00'
updated_at: '2026-06-28T20:55:18.726937+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
Clicking Confirm on the confirmation card while the "I own this site" checkbox is unchecked emits a "convert confirmed" signal carrying the target URL and an ownership flag of false, and the card collapses. The card performs no API calls of its own.

## Verification
Render the confirmation card, attach a listener for the convert-confirmed signal, click Confirm, and assert the signal payload equals `{ url: <target url>, ownsSite: false }` and that the card is now collapsed.
