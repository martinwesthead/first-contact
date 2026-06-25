---
uid: acceptance_criterion-02a1fe95
id: AC-472
type: acceptance_criterion
title: Persisted lead's ip_country is populated from the CF-IPCountry request header
created_by: xgd
created_at: '2026-06-25T01:47:45.406876+00:00'
updated_at: '2026-06-25T01:47:45.406876+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When a valid `POST /api/forms/contact` request is accompanied by a `CF-IPCountry` header (set by the Cloudflare edge), the inserted `leads` row's `ip_country` column equals the header value. When the header is absent, `ip_country` is stored as null.

## Verification

A test harness posts a valid submission with `CF-IPCountry: GB`, asserts the response is 200, queries the resulting `leads` row, and asserts `ip_country == "GB"`. A second test variant omits the header and asserts the resulting row's `ip_country` is null.
