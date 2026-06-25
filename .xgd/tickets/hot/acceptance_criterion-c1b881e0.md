---
uid: acceptance_criterion-c1b881e0
id: AC-451
type: acceptance_criterion
title: Files under the source assets/ tree are copied to <out>/assets/site/ preserving
  their relative paths
created_by: xgd
created_at: '2026-06-25T01:24:36.115151+00:00'
updated_at: '2026-06-25T01:24:36.115151+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

Every file under the source site's `assets/` directory (searched recursively) is copied into the output directory at `assets/site/<relative-path-from-source-assets>`. Empty or missing source `assets/` directories are tolerated (no error; simply no asset copies).

## Verification

Generate a fixture site whose `assets/` tree contains files at the root, in a nested subdirectory, and at multiple depths. Assert that each source file appears at the expected `<out>/assets/site/<relative-path>` location with matching bytes. Then generate a second fixture with no `assets/` directory and assert the generator completes successfully with an empty asset list.
