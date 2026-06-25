---
uid: acceptance_criterion-77bdec26
id: AC-470
type: acceptance_criterion
title: Submission with a malformed email is rejected with 400 INVALID_EMAIL and writes
  no lead
created_by: xgd
created_at: '2026-06-25T01:47:36.570931+00:00'
updated_at: '2026-06-25T01:47:36.570931+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request whose JSON body includes an `email` value that does not match the email format (no `@`, no domain part, internal whitespace) is rejected with:

- HTTP status `400`.
- JSON response body containing `success: false`, `error: "INVALID_EMAIL"`, and a human-readable `message`.

No row is inserted into the `leads` table and no Resend notification is sent.

## Verification

A test harness posts a JSON object containing `email: "not-an-email"` and asserts the response status is 400 and the JSON body's `error` field equals `INVALID_EMAIL`. The harness also asserts no row was added to `leads`.
