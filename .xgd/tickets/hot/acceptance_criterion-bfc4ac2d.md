---
uid: acceptance_criterion-bfc4ac2d
id: AC-443
type: acceptance_criterion
title: CLI fc-generate accepts --site, --out, and optional --clean flags and runs
  the generator
created_by: xgd
created_at: '2026-06-25T01:23:45.751024+00:00'
updated_at: '2026-06-25T01:23:45.751024+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

The packaged CLI binary `fc-generate` accepts three flags: `--site <path>` (required, source directory), `--out <path>` (required, output directory), and `--clean` (optional, boolean). Invoked with valid `--site` and `--out` arguments pointing at a valid site definition, it generates the static bundle and exits with status code 0; on success it prints a one-line summary naming the number of pages and assets written and the output directory.

## Verification

Invoke the CLI as a subprocess against a fixture site directory and a temporary output directory. Assert that the process exits with code 0, that stdout contains a single summary line referencing pages/assets and the output directory, and that the output directory contains the expected page files. Also verify that omitting `--site` or `--out` causes the CLI to print usage to stderr and exit non-zero.
