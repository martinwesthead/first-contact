---
uid: acceptance_criterion-29c2b0d4
id: AC-468
type: acceptance_criterion
title: Submission with malformed JSON body is rejected with 400 INVALID_JSON
created_by: xgd
created_at: '2026-06-25T01:47:21.660773+00:00'
updated_at: '2026-06-25T01:47:21.660773+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request with `Content-Type: application/json` whose body is not parseable as a JSON object (malformed JSON, JSON array, JSON primitive) is rejected with:

- HTTP status `400`.
- JSON response body containing `success: false`, `error: "INVALID_JSON"`, and a human-readable `message`.

No row is inserted into the `leads` table and no Resend notification is sent.

## Verification

A test harness posts a body that is not parseable as a JSON object (e.g. the literal string `not-json{` or the JSON array `[1,2,3]`) with `Content-Type: application/json` and asserts the response status is 400 and the JSON body's `error` field equals `INVALID_JSON`.
