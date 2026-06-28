---
uid: acceptance_criterion-1938bd41
id: AC-665
type: acceptance_criterion
title: Cancelling the confirmation signals cancel and collapses the card without converting
created_by: xgd
created_at: '2026-06-28T20:55:24.052492+00:00'
updated_at: '2026-06-28T20:55:24.052492+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
Clicking Cancel on the confirmation card emits a "convert cancelled" signal carrying the target URL, collapses the card, and does not initiate any conversion.

## Verification
Render the confirmation card, attach a listener for the convert-cancelled signal, click Cancel, and assert the signal payload equals `{ url: <target url>` (target URL present), the card is collapsed, and no convert-confirmed signal was emitted.
