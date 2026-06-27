---
uid: acceptance_criterion-e3356ab9
id: AC-599
type: acceptance_criterion
title: Analysis is refused without operator intent and proceeds with a pasted URL
  or a valid intent token
created_by: xgd
created_at: '2026-06-27T01:25:53.988276+00:00'
updated_at: '2026-06-27T01:25:53.988276+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
The analyze action only proceeds when operator intent is proven for the current turn. It returns a typed failure (message naming the missing intent) when neither condition holds: (a) the operators most recent chat message implies fetch intent (contains the URL or a fetch keyword), or (b) a fresh, session-bound intent token is supplied with the call. When either condition holds, analysis proceeds.

## Verification
Three cases: (1) no operator message and no token → failure result whose error states operator intent is required; (2) operators latest message contains the target URL → success; (3) a valid session-bound intent token supplied with a null operator message → success; a token bound to a different session or expired → failure.
