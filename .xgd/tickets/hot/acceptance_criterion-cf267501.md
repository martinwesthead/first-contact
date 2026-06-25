---
uid: acceptance_criterion-cf267501
id: AC-474
type: acceptance_criterion
title: Best-effort owner notification failures do not fail the request — the lead
  is persisted and the response is 200
created_by: xgd
created_at: '2026-06-25T01:48:03.307927+00:00'
updated_at: '2026-06-25T01:48:03.307927+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When the public-site Worker is configured to send an owner notification on each lead (a notification provider key, sender, and recipient are all configured), and the notification request to the external email provider fails (the provider returns a non-2xx status or the network call throws), the contact-form submission is still recorded:

- The HTTP response is `200` with `success: true` and a `lead_id`.
- A row is inserted into the `leads` table with all the submitted data.
- The notification failure is logged (so operators can detect it) but the caller is not informed of any failure.

## Verification

A test harness configures the Worker with notification credentials and posts a valid submission while the mocked notification endpoint returns a 500 response. The harness asserts the HTTP response is 200, the body contains `success: true` and a `lead_id`, and a row exists in `leads` matching the submission. A second test variant has the mocked notification endpoint throw a network error and asserts the same outcome.
