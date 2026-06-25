---
uid: acceptance_criterion-2d769e33
id: AC-453
type: acceptance_criterion
title: Missing or malformed site.json raises SiteLoadError describing the problem
  and the file path
created_by: xgd
created_at: '2026-06-25T01:24:46.285945+00:00'
updated_at: '2026-06-25T01:24:46.285945+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

If the source directory contains no `site.json` file, or if the file exists but does not parse as JSON, the load step raises a `SiteLoadError` whose message identifies the expected `site.json` path and, for parse failures, describes the underlying JSON syntax problem. The generator does not write any output.

## Verification

Run the generator (a) against a source directory containing no `site.json` and (b) against a source directory whose `site.json` contains invalid JSON. In each case assert that the call throws a `SiteLoadError`-typed error whose message names the `site.json` path and, for case (b), references the JSON parse error. Assert that the output directory contains no generated files.
