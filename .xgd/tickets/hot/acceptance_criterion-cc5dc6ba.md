---
uid: acceptance_criterion-cc5dc6ba
id: AC-444
type: acceptance_criterion
title: Programmatic runGenerate returns a result describing pages, theme stylesheet,
  and assets written
created_by: xgd
created_at: '2026-06-25T01:23:49.994480+00:00'
updated_at: '2026-06-25T01:23:49.994480+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

The programmatic entry point `runGenerate({ site, out, clean? })` accepts a site source directory, an output directory, and an optional clean flag, and resolves to a result object that lists the absolute paths of every page written, the absolute path of the per-site theme stylesheet, the absolute paths of every asset written, and the output directory.

## Verification

Call the API from a test runner with a fixture site directory and a temporary output directory. Assert that the returned object's `pagesWritten` contains one entry per page in the site definition, `cssPath` points at the theme stylesheet inside the output directory, `assetsWritten` lists every file copied from the site's `assets/` tree, and `outDir` equals the requested output directory.
