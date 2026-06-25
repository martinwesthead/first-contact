---
uid: acceptance_criterion-63719784
id: AC-476
type: acceptance_criterion
title: Contact-form client island attaches the Turnstile response token to its JSON
  submission when a Turnstile widget is rendered
created_by: xgd
created_at: '2026-06-25T01:48:23.960499+00:00'
updated_at: '2026-06-25T01:48:23.960499+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form page is rendered with a Turnstile widget mounted (the form contains a `data-turnstile-target` element and Cloudflare's Turnstile global has rendered the widget), the progressive-enhancement client script, upon intercepting a form submission, includes a `turnstile_token` property in the JSON body it POSTs to the form's action URL whose value equals the token returned by the rendered widget.

When no Turnstile widget is present on the form (the page was rendered without Turnstile loading, or the user submitted before the widget produced a response), the JSON body posted to the action URL does not include a `turnstile_token` property.

## Verification

A JSDOM-based test harness renders the contact-form HTML, mounts a stubbed `window.turnstile` global whose `getResponse` returns the literal token `"test-token"`, invokes the client enhancement to wire the form, intercepts the resulting fetch call, and asserts the request body parsed as JSON contains `turnstile_token: "test-token"`. A second test variant renders the same form without any Turnstile global available and asserts the intercepted JSON body has no `turnstile_token` key.
