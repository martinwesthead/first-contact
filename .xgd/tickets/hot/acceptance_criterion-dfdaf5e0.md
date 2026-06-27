---
uid: acceptance_criterion-dfdaf5e0
id: AC-571
type: acceptance_criterion
title: Operator-intent token is bound to its chat session
created_by: xgd
created_at: '2026-06-27T00:35:12.192558+00:00'
updated_at: '2026-06-27T00:35:12.192558+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A minted operator-intent token is scoped to the chat session it was minted under. Verifying the token from a different chat session returns `{ok:false, reason:'missing_intent', detail:'session_mismatch'}` and the token is NOT consumed (it remains valid for a verify from its own session).

## Verification

Mint a token with `sessionId:'A'`. Verify with `sessionId:'B'` and assert `ok:false`, reason `missing_intent`, detail `session_mismatch`. Then verify the same token with `sessionId:'A'` and assert `ok:true` (token still valid until consumed).
