---
uid: acceptance_criterion-033b0834
id: AC-471
type: acceptance_criterion
title: When Turnstile is configured, a submission whose token fails verification is
  rejected with 400 TURNSTILE_FAILED and writes no lead and sends no notification
created_by: xgd
created_at: '2026-06-25T01:47:42.193842+00:00'
updated_at: '2026-06-25T01:47:42.193842+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When the public-site Worker is configured with a Turnstile secret, a `POST /api/forms/contact` submission whose Turnstile token cannot be verified (the token is missing from the body, or Cloudflare's siteverify endpoint returns `success: false`) is rejected with:

- HTTP status `400`.
- JSON response body containing `success: false`, `error: "TURNSTILE_FAILED"`, and a human-readable `message`.

No row is inserted into the `leads` table and no Resend notification is sent. This holds even when every other field in the submission is otherwise valid.

## Verification

A test harness running the Worker with a Turnstile secret configured posts an otherwise-valid submission with a `turnstile_token` value, while the mocked Cloudflare siteverify endpoint returns `{ success: false }`. The harness asserts the response status is 400, the JSON body's `error` field equals `TURNSTILE_FAILED`, no row was added to `leads`, and no request was made to the mocked Resend endpoint. A second test variant omits `turnstile_token` entirely and asserts the same outcome.
