---
uid: acceptance_criterion-6e10cfab
id: AC-435
type: acceptance_criterion
title: Contact-form renders a hidden honeypot input that is visually concealed
created_by: xgd
created_at: '2026-06-25T01:12:01.656824+00:00'
updated_at: '2026-06-25T01:12:01.656824+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered, the form contains a honeypot input element that is hidden from sighted users (positioned off-screen or otherwise visually concealed) and excluded from the tab order, so legitimate users do not fill it but automated bots may.

## Verification

Render a contact-form and inspect its markup: assert that a honeypot input is present in the form, that its containing element applies visual concealment (off-screen positioning or equivalent), and that the input is marked out of the tab order (e.g. `tabindex="-1"`).
