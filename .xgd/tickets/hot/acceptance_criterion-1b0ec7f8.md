---
uid: acceptance_criterion-1b0ec7f8
id: AC-445
type: acceptance_criterion
title: Each page is emitted as an HTML5 document at its slug-derived output path
created_by: xgd
created_at: '2026-06-25T01:23:54.404238+00:00'
updated_at: '2026-06-25T01:23:54.404238+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

For every page in the validated site definition, the generator writes an HTML file whose location is derived from the page's slug: a root slug (`/` or empty) maps to `index.html` at the output root; any other slug maps to `<trimmed-slug>/index.html`. Each emitted page begins with an HTML5 doctype declaration and contains the standard top-level structure (root `<html>` with `<head>` and `<body>` regions).

## Verification

Generate a fixture site with both a root-slug page and at least one nested-slug page. Assert that the expected file path exists for each page, that each file's content begins with an HTML5 doctype, and that each file contains a single `<head>` region followed by a `<body>` region.
