---
uid: acceptance_criterion-8e2ee8d2
id: AC-682
type: acceptance_criterion
title: Builder bundler one-shot mode builds a non-empty bundle and exits cleanly
created_by: xgd
created_at: '2026-06-28T22:33:51.319369+00:00'
updated_at: '2026-06-28T22:33:51.319369+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The builder SPA bundler runs as a one-shot build when no `--watch`
flag is passed (the default `build:bundle` control-app script):

- The process performs a single build and exits with status code 0.
- It emits a `Built <outfile>` log line naming the produced bundle.
- It writes a non-empty bundle to
  `apps/control-app/public/_assets/builder.js`.

## Verification

Spawn the bundler with no `--watch` flag, assert the process exits 0,
assert the `Built …builder.js` log line is emitted, and assert the
output bundle file exists and is non-empty.
