---
uid: acceptance_criterion-ccf79b5f
id: AC-459
type: acceptance_criterion
title: GET /assets/theme.css returns 200 with the per-site theme token declarations
created_by: xgd
created_at: '2026-06-25T01:35:33.295237+00:00'
updated_at: '2026-06-25T01:35:33.295237+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

When the public-site Worker is running against the generated bundle for 1stcontact.io, a GET request to `/assets/theme.css` returns a 200 response whose body declares the site's theme tokens as CSS custom properties — at minimum the primary palette colour (`--color-primary` equal to `#2563eb`) and a space-scale variable derived from the configured spacing (`--space-4`).

## Verification

A test harness running the Worker bound to the freshly-generated output directory issues GET `/assets/theme.css`, observes a 200 status, and asserts that the response body matches:
- a `--color-primary:` declaration whose value is `#2563eb`,
- a `--space-4:` declaration.
