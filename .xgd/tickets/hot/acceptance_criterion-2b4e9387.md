---
uid: acceptance_criterion-2b4e9387
id: AC-683
type: acceptance_criterion
title: Control-app dev command runs the bundle watcher alongside the Worker dev server
created_by: xgd
created_at: '2026-06-28T22:33:55.287086+00:00'
updated_at: '2026-06-28T22:33:55.287086+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The control-app development command runs the builder bundle watcher
and the local Worker dev server together so that source edits surface
in the browser without a manual build:

- The control-app `dev` script launches the bundler in watch mode
  (`build:bundle:watch`) concurrently with `wrangler dev`, using a
  process runner that tears both down together when either exits.
- A `build:bundle:watch` script exists that invokes the bundler with
  `--watch`.

## Verification

Read `apps/control-app/package.json` and assert: a `build:bundle:watch`
script invokes the bundler script with `--watch`; the `dev` script
runs both `build:bundle:watch` and `wrangler dev` concurrently (e.g.
via `concurrently`) rather than running only the Worker dev server.
