---
uid: acceptance_criterion-44e38435
id: AC-437
type: acceptance_criterion
title: Without JavaScript, contact-form submits via a standard HTML POST to its action
  URL
created_by: xgd
created_at: '2026-06-25T01:12:16.479439+00:00'
updated_at: '2026-06-25T01:12:16.479439+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered and no client-side enhancement runs, submitting the form performs a standard HTML POST to the configured action URL with the form's field values, navigating the browser to the action response.

## Verification

Render a contact-form into a DOM with no enhancement script loaded; trigger a native form submission and observe that the form's `method` is POST and that the browser-equivalent submit behaviour targets the configured action URL (e.g., assert form `method="post"` and `action` equal to the configured URL, and that no JavaScript interceptor prevents default submission).
