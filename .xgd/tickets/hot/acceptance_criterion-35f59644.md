---
uid: acceptance_criterion-35f59644
id: AC-477
type: acceptance_criterion
title: GET /builder and /builder/ return the builder SPA shell via Workers Static
  Assets
created_by: xgd
created_at: '2026-06-25T01:58:55.893616+00:00'
updated_at: '2026-06-25T01:58:55.893616+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

A GET request to `/builder` (and to `/builder/`) on the control-app origin returns the builder SPA shell HTML — an HTML document containing the SPA mount point and a reference to the bundled SPA script — sourced from the Workers Static Assets binding. Requests to other paths (e.g. `/starter-sites/<name>.json`) are served by the same static-asset binding without rewriting.

## Verification

Issue a GET request to `https://app.1stcontact.io/builder` against the control-app Worker with the static-asset binding wired to serve the shell HTML. Verify the response status is 200, the body contains the SPA mount-point marker and a reference to the bundled SPA script, and the asset binding observed a request for the shell HTML path (i.e. the worker rewrote to it). Repeat for `/builder/`. Then request a different static asset path (e.g. `/starter-sites/1stcontact.json`) and verify the binding served it unchanged.
