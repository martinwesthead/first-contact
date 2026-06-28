---
uid: acceptance_criterion-74cc7d2c
id: AC-384
type: acceptance_criterion
title: control-app Worker serves placeholder response at root
created_by: xgd
created_at: '2026-06-25T00:28:26.514199+00:00'
updated_at: '2026-06-28T21:55:15.177598+00:00'
completed_at: null
last_field_updated: uat_coverage
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

A GET request to the control-app Worker's root path `/`, where no
static asset and no `/api/*` route matches, returns:

- HTTP status `200`
- Response body exactly `Hello from app.1stcontact.io`
- Response `content-type` header beginning with `text/plain`

## Verification

Boot the control-app Worker locally (e.g. via `wrangler`'s in-process
runner), issue a GET to `/`, and assert the status code, response
body, and content-type header. The assertion holds regardless of the
host the Worker is bound to in production.