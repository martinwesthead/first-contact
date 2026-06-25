---
uid: acceptance_criterion-526112fb
id: AC-438
type: acceptance_criterion
title: With JavaScript, contact-form intercepts submit and posts the form data as
  a JSON request body to the action URL
created_by: xgd
created_at: '2026-06-25T01:12:20.227362+00:00'
updated_at: '2026-06-25T01:12:20.227362+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered into a DOM with client enhancement active, submitting the form prevents native navigation and instead issues a POST request to the configured action URL whose body is a JSON document containing the form's field values keyed by field name.

## Verification

Render a contact-form into a DOM with the contact-form client enhancement active, stub the network request transport, trigger a submit event, and assert: native navigation was prevented; one network request was issued; the request URL equals the configured action; the method is POST; the content-type header is `application/json`; and the request body parses as JSON whose properties match the submitted field values.
