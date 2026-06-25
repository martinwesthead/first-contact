---
uid: acceptance_criterion-20a073da
id: AC-436
type: acceptance_criterion
title: Contact-form renders a Turnstile mount-target element
created_by: xgd
created_at: '2026-06-25T01:12:04.479740+00:00'
updated_at: '2026-06-25T01:12:04.479740+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered, the form contains a passive mount-target element identifiable as the location where a Turnstile widget will attach, so the Turnstile script can render the widget without further markup changes.

## Verification

Render a contact-form and assert the rendered markup contains a single element carrying the Turnstile mount marker (the `data-turnstile-target` attribute) inside the form's region.
