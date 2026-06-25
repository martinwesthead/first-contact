---
uid: story-f632db8a
id: STORY-44
type: story
title: Phase 0 1stcontact marketing site is served end-to-end by the public-site Worker
  via Workers Static Assets
created_by: xgd
created_at: '2026-06-25T01:34:39.814075+00:00'
updated_at: '2026-06-25T01:43:21.785063+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-474ee896
  story_kind: feature
  story_points: 2
---

## Story

**As a** visitor to 1stcontact.io,
**I want** the marketing site to load — header, hero, "how it works", services grid, founder note, contact form, and footer — styled with the configured theme and typography,
**so that** I can read about the 1st Contact product and submit a contact request from the live production domain.

**As a** platform operator,
**I want** the same generation step that produces the static bundle to run in CI and in deploy before the public-site Worker is published or dry-run validated,
**so that** the artifacts the Worker serves at runtime are guaranteed to match the site definition committed in the repository.

## Description

This story documents the published Phase 0 1stcontact.io marketing site: the concrete site definition that drives generation, the Cloudflare Worker that delivers the generated output via Workers Static Assets, and the CI/deploy workflow ordering that keeps the served bundle consistent with the committed site definition.

In scope:

- A real site definition for 1stcontact.io committed under the repository's `sites/1stcontact/` directory: a single `home` page with `nav.pattern: in-page-anchors`, the seven-module layout (header → hero → text-block landing → services-grid three-col → text-block prose → contact-form → footer), Manrope/Inter typography, primary colour `#2563eb`, accent `#f59e0b`, and the theme token superset documented by the site schema.
- A public-site Cloudflare Worker that exposes a Workers Static Assets binding (`ASSETS`) pointing at its generated output directory, in both the top-level configuration and the production environment configuration, so production deploys serve the same generated tree as local dev.
- GET and HEAD requests are delegated to the Static Assets binding; any non-asset path (including unknown URLs) returns a plain-text 404 response.
- A `generate` script on the public-site app invokes the static site generator against `sites/1stcontact`, and the app's `build`, `deploy`, and dry-run scripts run that generate step first.
- The CI workflow runs a "Generate public-site static output" step before the test run and the public-site dry-run deploy.
- The deploy workflow runs the same generate step before invoking `wrangler deploy` for the public-site Worker.

Out of scope (covered elsewhere):

- The generator itself (`tools/generate`, CLI `fc-generate`, programmatic API, validation, render pipeline, asset copy, font preloading) — STORY-43 / CAP-35 (Static Site Generator).
- The `POST /api/forms/contact` handler, D1 leads schema, Turnstile verification, Resend notification, generator Turnstile injection, and client token attachment — covered by the Lead Capture Pipeline story (plan item 8).
- The control-app Worker, the builder SPA, and the Anthropic chat proxy — covered by the Builder UI story (plan item 9).

## Technical Context

- The Worker delegates non-form GET/HEAD requests to the `ASSETS` binding and only synthesises a plain-text 404 when the binding itself returns a 404 (or a non-GET/HEAD request hits a non-handled path). This means the Worker contains no per-route handlers for marketing content; everything visible at `1stcontact.io/` originates from the generator output committed-or-built into `apps/public-site/public/`.
- The Workers Static Assets binding is configured both at the top of `wrangler.toml` (used by `wrangler dev` / `unstable_dev`) and under `[env.production.assets]`, because the production environment in Wrangler does not inherit the top-level assets block. Both must point at the same `./public` directory.
- The site definition (`site.json`) is authored against `@1stcontact/site-schema` (STORY-39 / CAP-32). Catalog membership (whether `hero` is a real module type, whether `three-col` is a real variant) is not validated by the schema — that check happens in the generator at render time.
- The contact form module in the site definition declares `action: "/api/forms/contact"`. The form handler at that path is the subject of a separate story (Lead Capture Pipeline). This story only documents that the marketing site definition includes the contact-form module pointing at that action URL; the handler's behaviour is asserted there.
- Generation is intentionally executed both in CI (before tests run, so UATs that exercise the Worker see fresh output) and in deploy (immediately before `wrangler deploy`, so the published bundle matches the committed definition). The workflow files (`.github/workflows/ci.yml` and `.github/workflows/deploy.yml`) encode this ordering, and the app's package scripts (`build`, `deploy`, `dryrun`) also run `pnpm generate` first to make local invocation match CI.

## Dependencies

- STORY-43 (Static Site Generator) — the public-site Worker serves the static bundle produced by `fc-generate`. The generate step in CI and deploy invokes that CLI.

## Story Points

2