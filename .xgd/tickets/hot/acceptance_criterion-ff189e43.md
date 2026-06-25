---
uid: acceptance_criterion-ff189e43
id: AC-439
type: acceptance_criterion
title: On a 2xx response, contact-form replaces itself with the configured success
  message
created_by: xgd
created_at: '2026-06-25T01:12:24.433234+00:00'
updated_at: '2026-06-25T01:12:24.433234+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When the client-enhanced contact-form's submit receives a 2xx response, the form element is removed from the DOM and replaced in-place by content rendered from the configured `successMessage` (or a default thank-you message when `successMessage` is not configured).

## Verification

Render a contact-form (with a known successMessage) into a DOM with client enhancement active; stub the network transport to return a 200 OK; trigger submit; assert the original form element is no longer present in the DOM and a success element containing the rendered successMessage occupies its location. Repeat without configuring successMessage and assert a non-empty default thank-you message is shown.
