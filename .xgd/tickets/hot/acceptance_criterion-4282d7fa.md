---
uid: acceptance_criterion-4282d7fa
id: AC-569
type: acceptance_criterion
title: Operator-intent token is required for an AI fetch tool call
created_by: xgd
created_at: '2026-06-27T00:35:04.624679+00:00'
updated_at: '2026-06-27T00:35:04.624679+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A token-verification check made with no token returns `{ok:false, reason:'missing_intent', detail:'no_token'}`. A check made with a token that is not present in the platform's intent-token store (never minted, or already consumed) returns `{ok:false, reason:'missing_intent', detail:'expired'}`.

The safety contract requires this check to gate any AI-initiated external fetch tool call.

## Verification

Against a stub KV with no tokens stored:
- Verify with `token: null` (or undefined): result is `ok:false`, reason `missing_intent`, detail `no_token`.
- Verify with an arbitrary string that was never minted: result is `ok:false`, reason `missing_intent`, detail `expired`.
- After minting a token and immediately verifying with it (same session): result is `ok:true` and the token is consumed (a second verify with the same token returns `missing_intent` with detail `expired`).
