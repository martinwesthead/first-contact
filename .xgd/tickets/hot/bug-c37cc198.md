---
uid: bug-c37cc198
id: BUG-7
type: bug
title: 'Dev workflow: pnpm dev:control does not rebuild builder SPA bundle on source
  change'
created_by: xgd
created_at: '2026-06-20T00:23:20.860987+00:00'
updated_at: '2026-06-20T00:28:32.582282+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: high
  severity: medium
  story_points: 1
  auto_merge_back: true
  needs_review: false
  commits:
  - 4bd1609e0f93a17e7237efa64faabed360c729f8
  version: 0.14.1236
---

## Symptom

Running `pnpm dev:control` and editing source in `packages/builder-ui/src/**` or `packages/framework/src/**` produces no visible change in the browser at http://localhost:8788/builder, no matter how many times the page is reloaded (even with cache disabled) and no matter how many times the dev server is restarted.

Discovered while testing the BUG-3 fix: the BUG-3 changes were merged to `xgd-working` and the dev server restarted, but the browser kept showing the pre-fix behavior. The "missing" REQ-31 Reset button (which has been on `main` since well before BUG-3) was the giveaway that the SPA bundle was old, not just my fix.

Reproduction:

1. `pnpm dev:control` from repo root.
2. Open http://localhost:8788/builder.
3. Edit any file under `packages/builder-ui/src/` or `packages/framework/src/` — e.g. add a `console.log` to `packages/builder-ui/src/main.ts` `bootBuilder`.
4. Hard-reload the browser.
5. The `console.log` is never emitted; the running SPA is the bundle that was last built by `pnpm --filter @1stcontact/control-app build:bundle`.

## Root cause

The builder SPA is served as a static asset, not as live source.

- `apps/control-app/package.json:6` — `"dev": "wrangler dev --port 8788"`. No file-watcher, no rebuild step.
- `apps/control-app/wrangler.toml:7-9` — `[assets] directory = "public"`, so wrangler serves `apps/control-app/public/_assets/builder.js` for `/builder/_assets/builder.js`.
- `apps/control-app/scripts/build-builder-bundle.mjs` — esbuild bundles `packages/builder-ui/src/spa.ts` into `public/_assets/builder.js`. Only invoked by `build:bundle`, `build`, `deploy`, `dryrun` — never by `dev`.

Result: a developer who runs `pnpm dev` and edits builder-ui or framework code sees no change in the browser. The only signal is "the page is the version frozen at the last `build:bundle` invocation" — silent staleness.

This caused real wasted time on the BUG-3 fix (~30 min of "is my fix not working? is the browser caching? is localStorage corrupting state?") before realizing the bundle itself was stale.

## Fix

Make `pnpm dev:control` run the bundler in watch mode alongside wrangler.

Options:

1. **`concurrently` in the dev script** (preferred — minimal, matches the existing pattern in the root `package.json` `dev` script). Wrap esbuild's `context.watch()` in a tiny `build-builder-bundle.watch.mjs` (or add a `--watch` flag to the existing script), then:

   ```json
   "dev": "concurrently -k -n bundle,wrangler -c yellow,magenta \"pnpm build:bundle:watch\" \"wrangler dev --port 8788\"",
   "build:bundle:watch": "node scripts/build-builder-bundle.mjs --watch",
   ```

2. **esbuild watch inside wrangler's lifecycle** — wrangler 3 has a `pre` hook in some configs; not as clean.

Shape 1 is the recommended path. The builder-ui and framework packages are TS source the bundler reads directly (no `tsc` step is needed for the SPA build), so esbuild's incremental watch is fast (~50ms per rebuild based on the cold-start time).

## Test plan

Manual smoke test (no automated UAT is realistic here — this is a dev-loop concern, not a runtime behavior):

1. `pnpm dev:control`.
2. Confirm initial bundle build happens at startup (esbuild logs the output path).
3. Open http://localhost:8788/builder.
4. Edit `packages/builder-ui/src/main.ts` — add a `console.log("WATCH-OK")` inside `bootBuilder`.
5. Save; observe esbuild rebuild log within ~200ms.
6. Hard-reload the browser; confirm `WATCH-OK` appears in the console.
7. Remove the `console.log`; observe rebuild; reload; gone.

Also verify the rebuild path includes both packages: edit `packages/framework/src/render/browser.ts` similarly and confirm the rebuild fires (esbuild's dep graph should pick it up automatically since the entry point pulls it transitively).