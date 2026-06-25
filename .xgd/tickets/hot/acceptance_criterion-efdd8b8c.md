---
uid: acceptance_criterion-efdd8b8c
id: AC-434
type: acceptance_criterion
title: Contact-form submits to the configured action URL
created_by: xgd
created_at: '2026-06-25T01:11:57.789090+00:00'
updated_at: '2026-06-25T01:11:57.789090+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered with a given `action` URL, its rendered `<form>` element's submit destination is that exact URL.

## Verification

Render a contact-form with a known action URL; assert that the rendered form element's action attribute equals the supplied URL.
