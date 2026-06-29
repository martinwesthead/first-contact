---
uid: acceptance_criterion-a8c41902
id: AC-765
type: acceptance_criterion
title: logo-strip columns dial emits the corresponding columns class, defaulting to
  4
created_by: xgd
created_at: '2026-06-29T23:45:04.631384+00:00'
updated_at: '2026-06-29T23:45:04.631384+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
The `columns` dial controls the desktop column count via the rendered output:
- A `columns` value of `3`, `4`, `5`, or `6` renders the matching `--columns-{N}` class.
- When the `columns` dial is omitted, the output renders the `--columns-4` class (default 4).

## Verification
Render the module for each supported `columns` value and assert the markup contains the corresponding `--columns-{N}` class. Render with no `columns` dial supplied and assert the markup contains `--columns-4`.
