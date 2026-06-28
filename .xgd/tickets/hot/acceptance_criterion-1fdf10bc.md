---
uid: acceptance_criterion-1fdf10bc
id: AC-681
type: acceptance_criterion
title: Builder bundler watch mode rebuilds the SPA on source change
created_by: xgd
created_at: '2026-06-28T22:33:47.704665+00:00'
updated_at: '2026-06-28T22:33:47.704665+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The builder SPA bundler supports a file-watching mode for development:

- Invoked with the `--watch` flag (e.g. via the `build:bundle:watch`
  control-app script), the bundler stays running instead of exiting
  after one build, and emits a `Watching <entry> → <outfile>` log
  line once the initial build completes.
- While watching, editing source anywhere in the bundle's entry
  dependency graph — under `packages/builder-ui` or
  `packages/framework` — triggers an incremental rebuild that
  rewrites the served bundle at `apps/control-app/public/_assets/builder.js`,
  so the change reaches the browser without a manual rebuild.

## Verification

Spawn the bundler with `--watch`, wait for the `Watching` log line,
record the output bundle's mtime, then modify a source file in the
entry graph (e.g. a file under `packages/builder-ui/src` or
`packages/framework/src`) and assert the output bundle's mtime
advances (it is rebuilt). Tear down the watcher process afterward.
