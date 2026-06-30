---
uid: story-067dc2f8
id: STORY-38
type: story
title: Monorepo + two-Worker Cloudflare deploy pipeline
created_by: xgd
created_at: '2026-06-25T00:28:15.576460+00:00'
updated_at: '2026-06-30T04:56:42.212384+00:00'
completed_at: null
last_field_updated: updated_by
status: updated
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-8bfbe75a
  story_kind: upgrade
  story_points: 2
  updated_by:
  - bundle-d4ce3987
  - bundle-44f53d53
---

## Story

**As a** platform operator,
**I want** a single pnpm monorepo whose two Cloudflare Worker apps are continuously validated on every pull request and automatically deployed to production whenever the `xgd-stable` branch advances — and whose builder SPA bundle rebuilds live while I develop,
**so that** the 1stcontact.io platform can ship safely and reproducibly without manual deploy steps and every new feature inherits a working build/deploy substrate.

## Description

This story documents the foundational deployment substrate every later
capability stands on:

- A pnpm-workspace monorepo containing two Cloudflare Worker apps
  (`apps/public-site`, `apps/control-app`) and scaffolding for the
  framework packages, the static site generator, the database
  migrations directory, and the vitest test suite.
- A reproducible toolchain: Node 20+ and pnpm 9+ enforced via the
  `engines` and `packageManager` fields, pnpm provisioned through
  corepack, and `pnpm-lock.yaml` committed so CI installs use
  `--frozen-lockfile`.
- The control-app Worker returns a plain-text placeholder
  `Hello from app.1stcontact.io` at `/` whenever no other route or
  static asset handles the request — proving the Worker is alive
  before any application code is wired in.
- A GitHub Actions CI workflow that runs on pull requests against
  `main`, `xgd-working`, and `xgd-stable`, installs dependencies,
  builds every workspace package, runs the test suite, and dry-runs
  the deploy of both Workers so a broken build cannot merge.
- A GitHub Actions deploy workflow that runs on push to `xgd-stable`
  (and on manual dispatch), produces a production build, and runs
  `wrangler deploy --env production` for both Workers, with a
  concurrency group preventing two deploys from racing on the same
  ref.
- A live dev loop for the control app: the builder SPA bundler runs
  in a file-watching mode that incrementally rebuilds the served
  bundle whenever builder-ui or framework source changes, and the
  control-app dev command runs that watcher alongside the local
  Worker dev server so edits surface in the browser without a manual
  rebuild step.
- All identifiers aligned to the `1stcontact` slug across the root
  `package.json` name, both Worker names in `wrangler.toml`, the
  `sites/1stcontact/` subdirectory, and the project's CLAUDE.md
  heading — so the deployed identity matches the domain
  (`1stcontact.io`).
- The workspace npm packages are published under the `@gendev/*`
  scope (renamed from `@1stcontact/*`) so the productization layer
  can be shared across products, while the *product* slug
  `1stcontact` (root package `name`, both Worker names,
  `sites/1stcontact/`, CLAUDE.md heading) is unchanged. Four empty
  productization package skeletons (`@gendev/api-contracts`,
  `@gendev/auth`, `@gendev/billing`, `@gendev/portal-ui`) are seeded
  under `packages/` ahead of their implementation, and the former
  `packages/ui-kit` stub is removed.

**Out of scope** for this story (delivered by later stories):
- Site schema, framework modules, the static generator, the public
  marketing site, the lead-capture pipeline, and the builder SPA.
- D1/R2/KV bindings on either Worker.
- The public-site placeholder response that originally shipped in
  this slot — superseded when the public-site Worker began serving
  generated static assets (covered by the Public Site Worker story).
- Cloudflare account secret provisioning (`CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`) — an operator task with no code.
- Any implementation inside the four seeded `@gendev` productization
  package skeletons — they ship empty, with their implementations
  delivered by follow-up REQs.

## Technical Context

- Implementation lives in `package.json`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `apps/{public-site,control-app}/`,
  `.github/workflows/{ci,deploy}.yml`, and `sites/1stcontact/`.
- The platform-architecture policy mandates Cloudflare Workers as the
  primary backend, Workers Static Assets for the control app, and
  GitHub used only for the platform's own CI/CD — this story is the
  surface where those policies first land.
- The builder SPA is served as a static asset built by the
  `build-builder-bundle.mjs` esbuild script. The script accepts a
  `--watch` flag that switches it from a one-shot `esbuild.build()`
  to `esbuild.context().watch()`; the control-app `dev` script uses
  `concurrently` to run that watcher (`build:bundle:watch`) next to
  `wrangler dev`. Because esbuild walks the entry dependency graph
  from `packages/builder-ui/src/spa.ts`, edits anywhere in the entry
  graph (builder-ui or framework) trigger an incremental rebuild
  with no extra plumbing. This dev watch-rebuild loop was added under
  BUG-7 to fix silent bundle staleness during development.
- The original REQ-1 intent named a public-site placeholder
  (`Hello from 1stcontact.io`). That placeholder was superseded
  mid-bundle by REQ-6, which began serving the generated site from
  the same route; the corresponding UAT was deleted. This story
  therefore only asserts the control-app placeholder, which still
  exists as the fallback when no asset or API route matches. The
  public-site behaviour is documented in the Public Site Worker
  story.
- The slug rename from `first-contact` → `1stcontact` (originally
  REQ-2) is configuration alignment with this deploy substrate, not
  a separate user-visible capability — it is folded in as ACs here.
- The npm *scope* and the *product* slug are independent identifier
  surfaces. REQ-50 renamed every workspace package from
  `@1stcontact/*` to `@gendev/*` — `name` fields, dependency keys,
  every `import` across `apps/**`, `packages/**`, `tools/**`, and
  `tests/**`, the `pnpm --filter @gendev/...` scripts, the CI/deploy
  workflow references, and the regenerated `pnpm-lock.yaml` — while
  leaving the product-slug ACs (AC-389) untouched (root package name
  `1stcontact`, Worker names `1stcontact-*`, `sites/1stcontact/`). The
  rename is mechanical with no runtime behaviour change: the built
  `apps/public-site` and generated `sites/1stcontact` output are
  byte-stable across it (modulo scope strings), and `apps/control-app`
  has a pre-existing TS DOM-type build failure (present on the
  baseline commit) that the rename neither introduces nor fixes — so
  build parity holds. The four seeded skeletons each carry a
  `package.json` named `@gendev/<name>`, a `tsconfig.json`, a README
  of role + design-doc links, and an empty `src/index.ts` that
  exports nothing real; `packages/ui-kit` (a stub superseded by
  `packages/portal-ui`) was deleted in the same change.
- Workflows include a `Generate public-site static output` step
  before tests / dry-run / deploy. That step is owned by the Public
  Site Worker story; this story asserts only the CI/deploy triggers,
  ordering of build/test/dry-run, and the production deploy of both
  Workers.

## Dependencies

None — this is the foundation other stories build on.

## Story Points

2