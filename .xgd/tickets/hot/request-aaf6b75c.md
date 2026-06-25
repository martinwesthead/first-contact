---
uid: request-aaf6b75c
id: REQ-6
type: request
title: tools/generate + 1st Contact marketing site definition + wire public-site
created_by: xgd
created_at: '2026-06-12T23:06:53.211523+00:00'
updated_at: '2026-06-25T02:40:56.077918+00:00'
completed_at: '2026-06-25T02:40:56.077918+00:00'
last_field_updated: status
status: free_and_reconciled
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 5
  commits:
  - bce23fdc1d1d393cfe65b73593a0e5c140341def
  bundled_in: bundle-94e1d1b6
---

## Scope

Build the static site generator (`tools/generate`), author the 1st Contact marketing site definition (`sites/1stcontact/site.json` + assets), and wire the generated output into `apps/public-site` so `1stcontact.io` serves the real marketing page instead of the placeholder.

Also adds the stub form endpoint `POST /api/forms/contact` on `public-site` returning `{success:true}` — sufficient for the contact form module to exercise its happy-path UX. The real handler (D1 + Resend + Turnstile) lands in REQ-7.

After this REQ: visiting `1stcontact.io` renders a real 1st Contact marketing page, the contact form submits to a working stub endpoint, and the system is end-to-end deployable. After REQ-7, leads are actually captured.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §2 (file-backed consumption path) and §11 (Build & Render Pipeline).

## Why free-coded

Integration step — pulls site-schema, framework modules, and the existing `public-site` Worker scaffold into a working site. The generator is straightforward (validate → render via Astro Container → write artifacts); the site definition is real content authored once. Single cohesive intent: ship the marketing site.

## What landed

### `tools/generate` (file-backed generator)

- `tools/generate/src/index.ts` — programmatic entry exporting `runGenerate()` for tests and library use.
- `tools/generate/src/cli.ts` — CLI: `fc-generate --site <path> --out <path> [--clean]`.
- `tools/generate/src/load.ts` — reads `<site>/site.json` + recursive `<site>/assets/**`, parses, validates against `@1stcontact/site-schema`. Returns a `SiteLoadError` with a JSON-pointer-style error report on schema failure.
- `tools/generate/src/render.ts` — uses Astro's `experimental_AstroContainer` to render each `ModuleInstance` through the framework registry (`getModule(id, version)`). Wraps each instance in `<div id="<id>" data-module-instance="...">` so nav anchors resolve. Generates per-site CSS from `generateThemeCss(theme)` plus all module `<style>` blocks (extracted via the new `loadModuleStyles()` helper) so the served page is fully styled. Emits `<head>` with viewport, SEO (title/description/og:image), Google Fonts preconnect+preload+stylesheet (derived from the site's typography families via the vetted shortlist), and `<link rel="stylesheet" href="/assets/theme.css">`.
- `tools/generate/src/output.ts` — writes pages, theme.css, and assets to disk; `--clean` wipes the output dir first.
- `tools/generate/bin/cli.mjs` — Node shim that re-execs the CLI under `vite-node` so the Astro vite plugin can compile `.astro` imports. `vite.config.mjs` uses `getViteConfig({})` from `astro/config`.
- Build step is intentionally a no-op (vite-node handles transformation at runtime); type-checking happens via the central vitest run.

D1-backed input remains a later REQ; the renderer is structured so the same code path will serve it.

### Framework additions

- `packages/framework/src/tokens/fonts.ts` — vetted Google Fonts shortlist (Inter, Manrope, Fraunces, Playfair Display, Space Grotesk, DM Serif Display, Outfit, Sora, Source Sans 3, IBM Plex Sans, Lora, Merriweather, Work Sans). Exports `VETTED_FONTS`, `findFontByFamilyDeclaration()`, `googleFontsHref()`.
- `packages/framework/src/modules/styles.ts` — `loadModuleStyles()` reads each registered module's `index.astro`, extracts the `<style>` block, and concatenates. Caches in-memory.

### `sites/1stcontact/site.json`

Real site definition for the Phase 0 marketing page. Single `home` page (`/`), `nav.pattern: "in-page-anchors"`, modules in order:

1. `header` (top-nav, logo "1st Contact", entries: How it works / About / Contact)
2. `hero` (`bg-color`, `lg`, centered, surface=subtle; CTA "Join early access" → `#contact`)
3. `text-block` (`landing`, centered, How it works)
4. `services-grid` (`three-col`, Build / Maintain / Operate)
5. `text-block` (`prose`, surface=subtle, founder note — exercises §7.4 graceful-degradation case)
6. `contact-form` (`#contact`, fields: name/email/business/message, action `/api/forms/contact`)
7. `footer` (logo, copyright "© 2026 GenDev Labs")

Theme: Manrope (heading) + Inter (body), primary `#2563eb`, accent `#f59e0b`. `assets/placeholder.png` (transparent 1×1 PNG) ships with the site so the build is green; real assets are an operator follow-up. `sites/1stcontact/README.md` documents how to regenerate locally.

### `apps/public-site`

- `apps/public-site/src/index.ts` — replaces the placeholder. Routes `POST /api/forms/contact` to the stub handler (validates `content-type: application/json`, parses body, silently drops honeypot submissions with `{success:true,dropped:true}`, otherwise returns `{success:true,dropped:false,message:"…"}`). All other GET/HEAD requests are delegated to the `ASSETS` Static Assets binding. Anything else (or asset 404) returns a plain-text 404.
- `apps/public-site/wrangler.toml` — adds `[assets] directory=./public binding=ASSETS` at top level and under `[env.production.assets]` so production also serves from generated output.
- `apps/public-site/package.json` — adds a `generate` script invoking `fc-generate` against `sites/1stcontact`; `build`/`deploy`/`dryrun` now generate first.

### CI / deploy workflows

- `.github/workflows/deploy.yml` — adds a "Generate public-site static output" step before the wrangler deploy.
- `.github/workflows/ci.yml` — same generate step before tests and the public-site dry-run.

### Site-schema widening (in support of REQ-6)

`ContentValue` previously only admitted string / AssetRef / array. The Phase 0 module catalog (REQ-5) declares object-shaped content fields (nav-entries, CTAs, services-grid items, contact-form fields), so the schema must accept plain objects under `content`. Widened to `string | number | boolean | null | AssetRef | ContentValue[] | { [key: string]: ContentValue }`. Same validator, same `validateSite()` shape — only the permitted value set expanded.

### Deleted

- `tests/test_UAT_FC_REQ-1_public_site_returns_placeholder.test.ts` — REQ-6 supersedes the placeholder behaviour, so the test for that placeholder is obsolete by design. Reconcile will resolve the matrix.

## Test coverage (UATs)

All passing in `pnpm test` (98 tests across 53 files):

- `test_UAT_FC_REQ-6_generator_validates_site_def_against_schema` — invalid site.json → `SiteLoadError`.
- `test_UAT_FC_REQ-6_generator_emits_index_html_with_all_module_anchors` — built `index.html` contains anchor ids for every module instance + doctype.
- `test_UAT_FC_REQ-6_generator_emits_per_site_css_with_theme_tokens` — `theme.css` carries `--color-primary: #2563eb`, `--space-4:`, and `index.html` links to it.
- `test_UAT_FC_REQ-6_generator_copies_assets_to_output` — `placeholder.png` lands at `out/assets/site/placeholder.png`.
- `test_UAT_FC_REQ-6_generator_preloads_configured_fonts` — `<head>` has preconnect + preload + stylesheet links naming the configured Manrope/Inter families.
- `test_UAT_FC_REQ-6_public_site_serves_generated_index` — `wrangler.unstable_dev` Worker returns the generated HTML on GET `/`.
- `test_UAT_FC_REQ-6_public_site_serves_generated_css` — Worker returns `theme.css` with the token declarations.
- `test_UAT_FC_REQ-6_form_stub_accepts_valid_post` — valid JSON POST → 200, `success:true`, `dropped:false`.
- `test_UAT_FC_REQ-6_form_stub_rejects_invalid_content_type` — form-encoded body → 400, `success:false`.
- `test_UAT_FC_REQ-6_form_stub_swallows_honeypot_submission` — honeypot filled → 200, `success:true`, `dropped:true`.
- `test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path` — unknown path → 404.
- `test_UAT_FC_REQ-6_deploy_workflow_runs_generate_before_deploy` — `.github/workflows/deploy.yml` and `ci.yml` order the generate step before wrangler/dryrun.

## Explicitly NOT in this ticket

- Real form handler — REQ-7 (D1 INSERT, Resend notification, Turnstile verification).
- D1 schema, migrations, or bindings on `public-site` — REQ-7.
- The control-app: builder UI, portal, authenticated endpoints. Separate later REQs.
- D1-backed site definitions for customer sites — `tools/generate` is file-backed in this REQ.
- Privacy / terms pages (referenced in the footer) — placeholders; content can land via a follow-up small REQ.
- Image generation or stock-image library — operator provides any images.
- Sitemap / robots.txt — follow-up.

## Dependencies / follow-up

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome + tokens), REQ-5 (framework content modules).
- **Unblocks**: REQ-7 — replaces stub `/api/forms/contact` with the real handler.
- **Operator follow-ups** (no code): finalize hero/manifesto/services/founder-note copy; provide real assets (hero image, logo, founder portrait if used); confirm SEO metadata and og:image.