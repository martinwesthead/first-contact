---
uid: acceptance_criterion-521a23de
id: AC-405
type: acceptance_criterion
title: Partial token input fills unspecified slots from the published defaults without
  dropping siblings
created_by: xgd
created_at: '2026-06-25T00:49:14.451824+00:00'
updated_at: '2026-06-25T00:49:14.451824+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

When the generator is invoked with a partial theme-token input — i.e. some
slots specified, others omitted — the produced stylesheet contains:
- The supplied value for each specified slot.
- The published default value for each unspecified slot.

When a nested group is partially overridden (e.g. only one spacing step
or one palette role is set), the unspecified siblings of that group are
still emitted with their default values; they are not dropped.

## Verification

Invoke the generator with an input that specifies only one slot in a
nested group (e.g. only `palette.primary = "#ff0000"`, or only one
spacing step). Assert:
- The overridden slot appears with the supplied value
  (`--color-primary: #ff0000;`).
- Other roles in the same group (e.g. `--color-bg`, `--color-text`)
  appear with the package's published default values.
- When only `spacing["4"]` is overridden, `--space-0` and `--space-24`
  appear with their default values.
