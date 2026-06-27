---
uid: acceptance_criterion-84fc3503
id: AC-570
type: acceptance_criterion
title: Operator-intent token expires after 60 seconds
created_by: xgd
created_at: '2026-06-27T00:35:08.485700+00:00'
updated_at: '2026-06-27T00:35:08.485700+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A minted operator-intent token is valid for at most 60 seconds from minting. A verification attempt made more than 60 seconds after minting returns `{ok:false, reason:'missing_intent', detail:'expired'}`, and the token is removed from the store on the failed verification.

## Verification

With an injected clock, mint a token at t=0 and assert:
- Verify at t=59 (same session): result is `ok:true`.
- Verify at t=60+ (after re-minting since the prior call consumed the token): result is `ok:false`, reason `missing_intent`, detail `expired`.
- The token store no longer contains the expired token after the failed verification.
