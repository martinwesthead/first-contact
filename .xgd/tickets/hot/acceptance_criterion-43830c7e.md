---
uid: acceptance_criterion-43830c7e
id: AC-440
type: acceptance_criterion
title: On a non-2xx response, contact-form remains visible and surfaces an inline
  error message
created_by: xgd
created_at: '2026-06-25T01:12:27.833489+00:00'
updated_at: '2026-06-25T01:12:27.833489+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When the client-enhanced contact-form's submit receives a non-2xx response, the form remains in the DOM (no navigation occurs) and an inline error message is shown adjacent to the form. The error message reflects the response body's error/message field when present, falling back to a generic failure message otherwise.

## Verification

Render a contact-form into a DOM with client enhancement active; stub the network transport to return a 400 with a JSON body `{ "error": "..." }`; trigger submit; assert the form element remains in the DOM, an inline error element is present whose text contains the response's error message, and no navigation occurred. Repeat with a non-JSON 500 response and assert a generic failure message is shown.
