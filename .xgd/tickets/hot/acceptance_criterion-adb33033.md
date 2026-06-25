---
uid: acceptance_criterion-adb33033
id: AC-467
type: acceptance_criterion
title: Submission with non-application/json content-type is rejected with 400 INVALID_CONTENT_TYPE
created_by: xgd
created_at: '2026-06-25T01:47:17.640883+00:00'
updated_at: '2026-06-25T01:47:17.640883+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request whose `Content-Type` header is not `application/json` (e.g. `text/plain`, `application/x-www-form-urlencoded`, or missing entirely) is rejected with:

- HTTP status `400`.
- JSON response body containing `success: false`, `error: "INVALID_CONTENT_TYPE"`, and a human-readable `message` describing the requirement.

No row is inserted into the `leads` table and no Resend notification is sent.

## Verification

A test harness posts to `/api/forms/contact` with a `Content-Type: text/plain` header and asserts the response status is 400 and the JSON body's `error` field equals `INVALID_CONTENT_TYPE`. The harness also asserts no row was added to `leads` and no Resend request was made.
