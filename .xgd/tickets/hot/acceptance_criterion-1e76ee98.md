---
uid: acceptance_criterion-1e76ee98
id: AC-667
type: acceptance_criterion
title: Stage events update the matching progress row in place without re-rendering
  the card
created_by: xgd
created_at: '2026-06-28T20:55:51.003134+00:00'
updated_at: '2026-06-28T20:55:51.003134+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
As stage events for the running conversion arrive, the corresponding stage row updates in place to reflect its status (started / completed / failed) while rows for stages that have not yet reported remain pending. The card is not re-rendered; the same card instance reflects the new state.

## Verification
Render the progress card, deliver stage events marking stages 1–3 completed, and assert those three rows show status "completed" while the still-unreported stage (Assets mirrored) remains "pending". Confirm the update mutated the existing card rather than replacing it.
