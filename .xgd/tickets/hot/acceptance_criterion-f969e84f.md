---
uid: acceptance_criterion-f969e84f
id: AC-454
type: acceptance_criterion
title: --clean flag wipes the output directory before writing new artifacts
created_by: xgd
created_at: '2026-06-25T01:24:51.253381+00:00'
updated_at: '2026-06-25T01:24:51.253381+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

When the generator is invoked with the clean option (CLI `--clean` or programmatic `clean: true`), the entire contents of the output directory are removed before any new page, stylesheet, or asset is written. Files left over from a previous generation (e.g. a stale page or asset) are not present in the output directory after a clean run. When the clean option is not set, the output directory is created if missing but its existing contents are preserved alongside the new output.

## Verification

Pre-populate a temporary output directory with a stale file at a known path that the current site definition would not produce. Run the generator with the clean option; assert that the stale file is absent from the output directory after the run and that all expected new files are present. Repeat the scenario without the clean option and assert the stale file is still present alongside the new files.
