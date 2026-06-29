---
uid: acceptance_criterion-2b4e9387
id: AC-683
type: acceptance_criterion
title: Control-app dev command runs the bundle watcher alongside the Worker dev server
created_by: xgd
created_at: '2026-06-28T22:33:55.287086+00:00'
updated_at: '2026-06-29T00:23:29.003091+00:00'
completed_at: null
last_field_updated: body
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
via `concurrently`) with `-k` so either process exiting tears down the
other — rather than running only the Worker dev server.

## Evidence limitation (explicitly accepted)

This AC is verified by **static configuration-wiring inspection**, not by
spawning the concurrent process tree, and that limitation is accepted
deliberately:

- `wrangler dev` requires the Cloudflare Workers runtime (miniflare/workerd)
  and binding configuration to boot. Launching it inside the test suite is
  heavy, slow, and environment-fragile in CI, with no deterministic teardown
  signal — exactly the kind of flaky external-process dependency the test
  strategy excludes.
- The **load-bearing behaviour of the bundler half is already covered
  behaviorally** by the sibling ACs, which spawn the real bundler `.mjs`:
  AC-681 (watch-mode incremental rebuild on source change) and AC-682
  (one-shot build produces a non-empty bundle and exits cleanly). What
  remains for AC-683 is solely the *wiring* — that the `dev` script composes
  those two commands under `concurrently -k` — which is fully observable in
  `package.json` and has no runtime behaviour beyond what the siblings prove.

The concurrent-launch wiring is therefore asserted by inspecting the
committed `dev` / `build:bundle:watch` scripts; the underlying watch/one-shot
behaviour it composes is proven behaviorally by AC-681/AC-682.
