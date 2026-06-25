---
uid: acceptance_criterion-8347ff3f
id: AC-452
type: acceptance_criterion
title: Schema validation failure raises SiteLoadError carrying a JSON-pointer-style
  report of every violation
created_by: xgd
created_at: '2026-06-25T01:24:42.078233+00:00'
updated_at: '2026-06-25T01:24:42.078233+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

When the source `site.json` parses as JSON but fails site-schema validation, the load step raises a `SiteLoadError` whose message identifies the validating file and, for each violation, includes a JSON-pointer-style path (e.g. `pages/0/modules/2/type`) and a description of the failure. The generator does not write any output when validation fails.

## Verification

Run the generator against a fixture `site.json` containing two distinct validation problems (e.g. a missing required field and an invalid hex color in the theme). Assert that the generator throws (CLI exits non-zero with the error on stderr; programmatic API rejects) with a `SiteLoadError`-typed error whose message names the violating file and contains the JSON-pointer path of each violation. Assert that the output directory contains no page or asset files written by this run.
