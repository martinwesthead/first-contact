---
uid: story-067dc2f8
id: STORY-38
type: story
title: Monorepo + two-Worker Cloudflare deploy pipeline
created_by: xgd
created_at: '2026-06-25T00:28:15.576460+00:00'
updated_at: '2026-06-25T00:35:20.598825+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-8bfbe75a
  story_kind: feature
  story_points: 2
---

## Story

**As a** platform operator,
**I want** a single pnpm monorepo whose two Cloudflare Worker apps are continuously validated on every pull request and automatically deployed to production whenever the `xgd-stable` branch advances,
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
- All identifiers aligned to the `1stcontact` slug across the root
  `package.json` name, both Worker names in `wrangler.toml`, the
  `sites/1stcontact/` subdirectory, and the project's CLAUDE.md
  heading — so the deployed identity matches the domain
  (`1stcontact.io`).

**Out of scope** for this story (delivered by later stories):
- Site schema, framework modules, the static generator, the public
  marketing site, the lead-capture pipeline, and the builder SPA.
- D1/R2/KV bindings on either Worker.
- The public-site placeholder response that originally shipped in
  this slot — superseded when the public-site Worker began serving
  generated static assets (covered by the Public Site Worker story).
- Cloudflare account secret provisioning (`CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`) — an operator task with no code.

## Technical Context

- Implementation lives in `package.json`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `apps/{public-site,control-app}/`,
  `.github/workflows/{ci,deploy}.yml`, and `sites/1stcontact/`.
- The platform-architecture policy mandates Cloudflare Workers as the
  primary backend, Workers Static Assets for the control app, and
  GitHub used only for the platform's own CI/CD — this story is the
  surface where those policies first land.
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
- Workflows include a `Generate public-site static output` step
  before tests / dry-run / deploy. That step is owned by the Public
  Site Worker story; this story asserts only the CI/deploy triggers,
  ordering of build/test/dry-run, and the production deploy of both
  Workers.

## Dependencies

None — this is the foundation other stories build on.

## Story Points

2