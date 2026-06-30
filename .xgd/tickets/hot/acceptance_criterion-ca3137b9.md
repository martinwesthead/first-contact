---
uid: acceptance_criterion-ca3137b9
id: AC-821
type: acceptance_criterion
title: Scope rename is byte-stable for builds and generated site output (parity)
created_by: xgd
created_at: '2026-06-30T04:56:15.042122+00:00'
updated_at: '2026-06-30T04:56:15.042122+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The npm-scope rename introduces no runtime or output change — build
behaviour is identical before and after the rename (modulo scope
strings):

- `apps/public-site` builds and `sites/1stcontact` generates static
  output that is byte-stable across the rename (only `@gendev/*` scope
  strings differ from the pre-rename output).
- `apps/control-app`'s build outcome is unchanged: its pre-existing
  TypeScript DOM-type build failure (present on the baseline commit) is
  neither introduced nor fixed by the rename.

## Verification

Build `apps/public-site` and generate `sites/1stcontact` and diff the
output against the pre-rename baseline, asserting differences are limited
to `@gendev/*` scope strings. Build `apps/control-app` and assert its
pass/fail outcome matches the baseline commit (the pre-existing failure
persists; the rename changes nothing).
