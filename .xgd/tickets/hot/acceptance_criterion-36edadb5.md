---
uid: acceptance_criterion-36edadb5
id: AC-752
type: acceptance_criterion
title: align dial applies a matching alignment style hook and defaults to center
created_by: xgd
created_at: '2026-06-29T23:21:10.660776+00:00'
updated_at: '2026-06-29T23:21:10.660776+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
The `align` dial controls text alignment of the rendered section by applying an alignment style hook corresponding to the selected value (`left` or `center`). When `align` is set to `left`, the section carries the left-alignment hook and not the center one. When `align` is unspecified, alignment defaults to `center`: the section carries the center-alignment hook and not the left one.

## Verification
Render the module with `align=left` and assert the rendered section carries the left-alignment hook and not the center hook. Render it without an `align` value and assert the section carries the center-alignment hook (the default) and not the left hook.
