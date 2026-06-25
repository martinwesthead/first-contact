---
uid: acceptance_criterion-3cfac009
id: AC-466
type: acceptance_criterion
title: Submission with the honeypot field populated returns a success response but
  writes no lead and sends no notification
created_by: xgd
created_at: '2026-06-25T01:47:06.949345+00:00'
updated_at: '2026-06-25T01:47:06.949345+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request whose JSON body contains a non-empty value for the honeypot field (`website`) is silently treated as spam: the response is HTTP `200` with a JSON body whose `success` is `true`, but:

- No row is inserted into the `leads` table.
- No Resend notification request is made.

The success-shaped response is required so that automated submitters cannot tell their submission was dropped.

## Verification

A test harness posts a submission containing `website: "spammy"` (with all other fields otherwise valid), asserts the HTTP status is 200 and the JSON body indicates success, queries the `leads` table to assert no new row was inserted, and asserts the mocked Resend endpoint received no request.
