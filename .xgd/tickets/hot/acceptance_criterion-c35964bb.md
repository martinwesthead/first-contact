---
uid: acceptance_criterion-c35964bb
id: AC-406
type: acceptance_criterion
title: Calling the generator with no token input produces a fully-defaulted stylesheet
  with a neutral palette and system fonts
created_by: xgd
created_at: '2026-06-25T00:49:26.415989+00:00'
updated_at: '2026-06-25T00:49:26.415989+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

When the generator is invoked with no theme-token input (or an empty
input), the produced stylesheet contains every documented slot, each set
to the package's published default value. The published defaults describe
a neutral light-mode palette and reference system fonts for both
typography families so the result is usable as-is without further
configuration.

## Verification

Invoke the generator with no arguments. Assert:
- The stylesheet contains custom properties for every locked theme slot
  (as enumerated in AC-403).
- Each value matches the package's published default-token export, so a
  consumer can reference the defaults to know exactly what was emitted.
- The default palette values describe a light-mode neutral scheme (e.g.
  background and surface are light colors; text is dark).
- The default typography families reference system fonts (e.g.
  `system-ui`).
