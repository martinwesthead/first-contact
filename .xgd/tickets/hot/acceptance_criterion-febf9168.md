---
uid: acceptance_criterion-febf9168
id: AC-469
type: acceptance_criterion
title: Submission missing the email field is rejected with 400 MISSING_FIELD and writes
  no lead
created_by: xgd
created_at: '2026-06-25T01:47:24.848729+00:00'
updated_at: '2026-06-25T01:47:24.848729+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request whose JSON body does not include a non-empty `email` value (missing entirely, empty string, or whitespace-only) is rejected with:

- HTTP status `400`.
- JSON response body containing `success: false`, `error: "MISSING_FIELD"`, and a human-readable `message`.

No row is inserted into the `leads` table and no Resend notification is sent.

## Verification

A test harness posts a JSON object containing only `name: "Alice"` (no `email`) and asserts the response status is 400 and the JSON body's `error` field equals `MISSING_FIELD`. The harness also asserts no row was added to `leads`.
