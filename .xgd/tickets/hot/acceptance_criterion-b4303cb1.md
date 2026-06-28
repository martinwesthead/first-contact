---
uid: acceptance_criterion-b4303cb1
id: AC-623
type: acceptance_criterion
title: First convert attempt on an unconfirmed URL requests confirmation and does
  not mutate the draft
created_by: xgd
created_at: '2026-06-28T20:10:16.249184+00:00'
updated_at: '2026-06-28T20:10:16.249184+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
When the operator triggers a convert of a source URL whose conversion has not yet
been confirmed in the current chat session, the action returns a confirmation
request (a result identifying the convert-confirmation, the source URL, and a
destructive-overwrite prompt naming that URL) and performs NO mutation of the
working draft.

## Verification
Invoke the convert action for an analyzed URL with no prior consent recorded.
Assert the result is the confirmation request (carries the source URL and a
prompt stating the conversion will replace the current draft and cannot be
automatically undone), and that the working draft is unchanged.
