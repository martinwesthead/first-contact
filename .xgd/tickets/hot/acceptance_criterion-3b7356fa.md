---
uid: acceptance_criterion-3b7356fa
id: AC-662
type: acceptance_criterion
title: Convert confirmation card renders with destructive prompt, ownership checkbox,
  and Confirm/Cancel actions
created_by: xgd
created_at: '2026-06-28T20:55:15.982353+00:00'
updated_at: '2026-06-28T23:31:47.175624+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
The convert flow surfaces no confirmation card: no renderer is registered for `kind: "convert_confirmation"`, so a tool result carrying that kind has no special "Convert site" card (no destructive-overwrite prompt, no "I own this site" checkbox, no Confirm/Cancel actions) and instead falls back to the plain summary card produced by the dispatcher for unregistered kinds.

## Verification
With the builder booted, render a tool result whose applied kind is `convert_confirmation`. Assert no warning-toned "Convert site" card is produced — no ownership checkbox and no Confirm/Cancel actions appear — and the dispatcher emits the generic summary fallback card instead.
