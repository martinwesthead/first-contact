---
uid: acceptance_criterion-f000619b
id: AC-473
type: acceptance_criterion
title: Non-canonical submission fields are preserved in the lead's extra_fields JSON
  column
created_by: xgd
created_at: '2026-06-25T01:47:57.342702+00:00'
updated_at: '2026-06-25T01:47:57.342702+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When a valid `POST /api/forms/contact` submission includes properties that are not part of the canonical contact-field set (`name`, `email`, `phone`, `message`, `page_path`, `turnstile_token`, `website`), the inserted `leads` row's `extra_fields` column contains a JSON-encoded object whose properties are exactly the submission's non-canonical fields and their values. When the submission contains no non-canonical fields, `extra_fields` is stored as null.

## Verification

A test harness posts a valid submission containing additional properties such as `business_name: "Acme Co"` and `service_interest: "consulting"`, asserts the response is 200, queries the resulting `leads` row, parses `extra_fields` as JSON, and asserts the parsed object equals `{ business_name: "Acme Co", service_interest: "consulting" }`. A second test variant posts a submission with only canonical fields and asserts `extra_fields` is null in the resulting row.
