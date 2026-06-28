---
uid: acceptance_criterion-558c10cb
id: AC-664
type: acceptance_criterion
title: Confirming with 'I own this site' checked signals proceed with ownsSite=true
created_by: xgd
created_at: '2026-06-28T20:55:21.345867+00:00'
updated_at: '2026-06-28T20:55:21.345867+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When the operator checks the "I own this site" checkbox and then clicks Confirm, the emitted "convert confirmed" signal carries an ownership flag of true (which authorizes a per-origin robots override) along with the target URL.

## Verification
Render the confirmation card, check the ownership checkbox, attach a listener for the convert-confirmed signal, click Confirm, and assert the signal payload's ownership flag is true.
