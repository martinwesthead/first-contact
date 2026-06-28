---
uid: acceptance_criterion-d455ff26
id: AC-460
type: acceptance_criterion
title: GET on an unknown path returns a 404 response
created_by: xgd
created_at: '2026-06-25T01:35:40.683627+00:00'
updated_at: '2026-06-28T20:13:23.606057+00:00'
completed_at: null
last_field_updated: uat_coverage
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

When the public-site Worker is running against the generated bundle for 1stcontact.io, a GET request to a path that does not correspond to a generated asset returns a 404 response carrying a plain-text (`text/plain`) content type.

## Verification

A test harness running the Worker bound to the freshly-generated output directory issues a GET request to a path known not to exist in the bundle (e.g. `/does-not-exist-anywhere`), observes a 404 status, and asserts that the response `Content-Type` header begins with `text/plain`.