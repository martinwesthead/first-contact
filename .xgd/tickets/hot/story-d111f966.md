---
uid: story-d111f966
id: STORY-43
type: story
title: Static site generator turns a validated site definition into a deployable HTML/CSS/assets
  bundle, via programmatic API and CLI
created_by: xgd
created_at: '2026-06-25T01:23:22.609200+00:00'
updated_at: '2026-06-25T01:23:22.609200+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-820fbc22
  story_kind: feature
  story_points: 3
---

## Story

**As a** platform operator or public-site build pipeline,
**I want** a static site generator that consumes a file-backed site definition (`site.json` + assets) and produces a deployable bundle of HTML pages, a per-site theme stylesheet, and copied assets,
**so that** the same validated site contract can be materialized into static output for any consumer (the 1stcontact public-site Worker today, the builder preview pipeline tomorrow) without requiring per-site bespoke build code.

## Description

This story documents the static site generator that bridges the abstract site contract (`@1stcontact/site-schema`) and the live module catalog (`@1stcontact/framework`) into a concrete file tree the public-site Worker can serve from Workers Static Assets.

In scope:

- A programmatic entry point that accepts a site source directory, an output directory, and an optional clean flag, and returns a result describing which pages, stylesheet, and assets were written.
- A command-line entry point (`fc-generate`) that wraps the programmatic API with `--site`, `--out`, and `--clean` flags, prints a one-line success summary on success, and exits non-zero with a stderr message on failure.
- Loading: read `site.json` from the source directory, parse it, validate it against `@1stcontact/site-schema`, and collect every file under the source directory's `assets/` tree (recursively).
- Rendering: for each page, render each module instance through the framework registry and wrap the rendered output in an anchor element (an outer element carrying the instance's id and a `data-module-instance` attribute) so in-page nav anchors resolve. Pages emit a valid HTML5 document.
- Theme stylesheet: produce a single per-site `theme.css` that concatenates the output of the theme-token CSS generator with the styles extracted from every registered framework module, and write it to `/assets/theme.css` in the output directory.
- `<head>` content: every page emits a viewport meta tag, the page title (with sensible fallbacks to the page title and site business name), an optional meta description (fallback to site tagline), `og:title`, optional `og:description`, optional `og:image`, and a stylesheet link to the generated theme stylesheet. When the site's heading or body typography families resolve via the vetted Google Fonts shortlist, the page also emits `preconnect`, `preload`, and `stylesheet` links for those families.
- Asset emission: copy every file under the source `assets/` tree to `<out>/assets/site/` preserving its relative path.
- Clean: when `--clean` is set, wipe the output directory before writing.

Out of scope (handled elsewhere):

- The site definition itself for the 1stcontact marketing page and the public-site Worker that serves the generated output (see [[story-public-site-worker]]).
- D1-backed site definitions; this generator is file-backed only in Phase 0.
- Form submission handling, Turnstile verification, and lead persistence (see [[story-lead-capture-pipeline]]).

## Technical Context

- Built on the Phase 0 dependencies: `@1stcontact/site-schema` (validation contract), `@1stcontact/framework` (`generateThemeCss`, `loadModuleStyles`, `getModule`, vetted-fonts helpers, module registry), and Astro's `experimental_AstroContainer` for rendering `.astro` components to string.
- The CLI is implemented as a thin Node shim that re-execs the TypeScript entry point under `vite-node` with an Astro vite config so `.astro` imports compile at runtime; the package itself has no compiled build artifact. This is an implementation detail of how the generator runs, not a user-observable behavior.
- Schema validation surfaces errors as a typed exception (`SiteLoadError`) whose message contains a JSON-pointer-style report of each violation, so callers (CLI and future preview pipelines) can present actionable failures.
- Catalog membership (whether `hero` exists as a module type, whether a variant is real) is validated at render time by the framework, not by the loader — consistent with the boundary defined by [[story-site-schema]].
- The contact-form Turnstile script tag and `fc-turnstile-site-key` meta are emitted in `<head>` only when the page contains a contact-form module AND a `TURNSTILE_SITE_KEY` environment variable is set; the lead-capture wiring that consumes this is owned by [[story-lead-capture-pipeline]] and is documented there rather than as an AC of this story.

## Dependencies

- Plan items 2, 3, 4, 5: site-schema, theme tokens + CSS generator, chrome modules, content modules.

## Story Points

3
