---
uid: acceptance_criterion-d7faa3c8
id: AC-465
type: acceptance_criterion
title: POST /api/forms/contact with a valid submission persists a lead and returns
  200 with a lead_id
created_by: xgd
created_at: '2026-06-25T01:47:02.602831+00:00'
updated_at: '2026-06-25T01:47:02.602831+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

A `POST /api/forms/contact` request to the public-site Worker with:

- Header `Content-Type: application/json`.
- A JSON body containing a well-formed `email` (and optionally `name`, `phone`, `message`, `page_path`).
- Any required Turnstile token included when a Turnstile secret is configured (mocked to succeed in tests).

returns:

- HTTP status `200`.
- A JSON response body containing `success: true`, a human-readable confirmation `message`, and a non-empty `lead_id`.

After the response, the `leads` table contains exactly one new row whose:

- Primary key equals the response's `lead_id`.
- `site_id` equals the Worker's configured `SITE_ID` value.
- `form_id` is `"contact"`.
- `email` equals the submitted email (trimmed).
- Optional fields are populated from the submission (or stored as null when omitted).
- `status` is `"new"`.
- `created_at` is a unix-millisecond integer.

## Verification

A test harness running the public-site Worker (e.g. via `unstable_dev`) against a fresh local D1 database posts a valid contact submission with a mocked successful Turnstile verifier, asserts the response status, body shape, and `lead_id` presence, then queries the `leads` table directly and asserts the inserted row's columns match the criterion.
