---
uid: acceptance_criterion-472a6a0a
id: AC-702
type: acceptance_criterion
title: Stage 0 'Clearing draft' row flips to cleared in place on the clear-to-scaffold
  stage event
created_by: xgd
created_at: '2026-06-28T23:32:45.942011+00:00'
updated_at: '2026-06-28T23:32:45.942011+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
The Stage 0 "Clearing draft" row updates in place to a "cleared" status when the convert flow's clear-to-empty-scaffold stage event arrives (stage 0, status "cleared"), without re-rendering the card. Rows for stages that have not yet reported remain pending.

## Verification
Render the progress card, deliver a stage event for stage 0 with status "cleared", and assert the Clearing-draft row's status is now "cleared" while later stage rows remain "pending" and the same card instance was mutated (not replaced).
