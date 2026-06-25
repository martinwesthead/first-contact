---
uid: acceptance_criterion-7af37fdc
id: AC-448
type: acceptance_criterion
title: Every rendered page links to the generated theme stylesheet at /assets/theme.css
created_by: xgd
created_at: '2026-06-25T01:24:13.071529+00:00'
updated_at: '2026-06-25T01:24:13.071529+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

The `<head>` of every rendered page contains a `<link rel="stylesheet">` element whose `href` is `/assets/theme.css`, so the page loads the generated theme stylesheet at the same absolute path the generator writes it to.

## Verification

Generate a fixture site with one or more pages and parse each emitted HTML file. Assert that each page's `<head>` contains a stylesheet link with `href="/assets/theme.css"`.
