---
uid: acceptance_criterion-d9ad5fd2
id: AC-458
type: acceptance_criterion
title: GET / returns 200 with the generated marketing HTML including module instance
  anchors
created_by: xgd
created_at: '2026-06-25T01:35:25.252740+00:00'
updated_at: '2026-06-25T01:35:25.252740+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

When the public-site Worker is running against the generated bundle for 1stcontact.io, a GET request to `/` returns a 200 response whose body is a valid HTML5 document (begins with the HTML5 doctype), contains the literal text `1st Contact`, and includes anchor elements carrying the module instance ids declared in the site definition (e.g. an element with `id="hero"`).

## Verification

A test harness (e.g. `wrangler.unstable_dev`) running the Worker bound to the freshly-generated output directory issues GET `/`, observes a 200 status, and asserts that the response body contains:
- the HTML5 doctype,
- the literal `1st Contact`,
- at least one element with the id of a module instance declared in the site definition.
