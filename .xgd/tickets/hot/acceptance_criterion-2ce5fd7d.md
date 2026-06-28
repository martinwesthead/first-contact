---
uid: acceptance_criterion-2ce5fd7d
id: AC-616
type: acceptance_criterion
title: HEAD / returns 200 from the public-site Worker via the Static Assets binding
created_by: xgd
created_at: '2026-06-28T19:50:13.588025+00:00'
updated_at: '2026-06-28T20:01:45.786873+00:00'
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

When the public-site Worker is running against the generated bundle for 1stcontact.io, a HEAD request to `/` returns a 200 response, with the request delegated to the Static Assets binding the same way a GET request is.

## Verification

A test harness (e.g. `wrangler.unstable_dev`) running the Worker bound to the freshly-generated output directory issues HEAD `/` and observes a 200 status.