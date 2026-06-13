---
uid: request-aaf6b75c
id: REQ-6
type: request
title: tools/generate + 1st Contact marketing site definition + wire public-site
created_by: xgd
created_at: '2026-06-12T23:06:53.211523+00:00'
updated_at: '2026-06-13T17:13:50.780097+00:00'
completed_at: null
last_field_updated: status
status: in_progress
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 4
---

## Scope

Build the static site generator (`tools/generate`), author the 1st Contact marketing site definition (`sites/1stcontact/site.json` + assets), and wire the generated output into `apps/public-site` so `1stcontact.io` serves the real marketing page instead of the placeholder.

Also adds the stub form endpoint `POST /api/forms/contact` on `public-site` returning `{success:true}` — sufficient for the contact form module to exercise its happy-path UX. The real handler (D1 + Resend + Turnstile) lands in REQ-7.

After this REQ: visiting `1stcontact.io` renders a real 1st Contact marketing page, the contact form submits to a working stub endpoint, and the system is end-to-end deployable. After REQ-7, leads are actually captured.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §2 (file-backed consumption path) and §11 (Build & Render Pipeline).

## Why free-coded

Integration step — pulls site-schema, framework modules, and the existing `public-site` Worker scaffold into a working site. The generator is straightforward (validate → render via Astro → write artifacts); the site definition is real content authored once. Single cohesive intent: ship the marketing site.

## Deliverables

### `tools/generate`

- `tools/generate/src/index.ts` — CLI entry: `generate --site <path> --out <path>`.
- `tools/generate/src/load.ts` — loads `<path>/site.json` and `<path>/assets/*`, parses, validates against `@1stcontact/site-schema`.
- `tools/generate/src/render.ts` — wraps Astro's build API. For each page:
  - Resolves each `ModuleInstance` via `packages/framework`'s registry.
  - Renders the page as an Astro component composed of module components, passing `{config, dials, content, assets, theme}`.
  - Generates the per-site CSS file via `generateThemeCss`.
  - Emits `<head>` with SEO metadata, font preloads, generated CSS link.
- `tools/generate/src/output.ts` — writes static output (HTML + CSS + JS bundle + asset copies) to the configured `--out` directory.
- The generator accepts only file-backed input in this REQ. The D1-backed path (same renderer reading site definitions from D1 for customer sites) is a later REQ — captured as an open item in [[DOC-7]] §13.

### `sites/1stcontact/site.json`

The real site definition for the Phase 0 marketing page. Concretely:

- **`theme`** — palette (TBD with operator: 7 color roles), fonts from the vetted Google Fonts shortlist (TBD: 1 display + 1 body), spacing/radius/shadow on the default scales.
- **`nav`** — pattern: `in-page-anchors`, entries linking to the module anchors below.
- **`pages`** — one page (`path: '/'`), modules in order:
  1. `header` (top-nav, logo: "1st Contact" wordmark, entries: How it Works, About, Contact)
  2. `hero` (variant `bg-color`, heading TBD with operator, CTA: "Join early access" linking to `#contact`)
  3. `text-block` (variant `landing`, manifesto copy TBD with operator)
  4. `services-grid` (variant `three-col`, three "Build / Maintain / Operate" items, body copy TBD with operator)
  5. `text-block` (variant `prose`, founder note TBD with operator — exercises the §7.4 graceful-degradation case)
  6. `contact-form` (id `#contact`, fields: name, email, business name, message; action `/api/forms/contact`; success message TBD with operator)
  7. `footer` (logo, copyright "© 2026 GenDev Labs", optional links: privacy, terms — pages can be added in a later REQ)
- **`seoMeta`** — title `1st Contact — Stop worrying about your website`, description TBD with operator, og:image TBD.
- **`assets`** — placeholder assets present (transparent 1x1 PNG for any missing image) so the build is green; real assets attached when copy is finalized.

A `sites/1stcontact/README.md` documents how to regenerate the site locally.

### Wire `apps/public-site`

- `apps/public-site/src/index.ts` — replace the placeholder handler:
  - Serve static assets from the generated output (via Workers Static Assets binding).
  - `POST /api/forms/contact` — stub handler returning `{success: true, message: "Thanks — we'll be in touch."}`. Adds basic JSON parse + content-type check. Honeypot field rejected (returns 200 silently — looks successful to bots, drops the submission). No D1 write, no email send (REQ-7).
  - Any non-asset, non-stub-API request returns 404 with the framework's 404 page (rendered from a tiny module-less template; full 404 module is a later concern).
- `apps/public-site/wrangler.toml` — add `[assets]` binding pointing at the generator's output directory.
- `apps/public-site/package.json` — add `build` script invoking `tools/generate` before `wrangler deploy`.
- Update `.github/workflows/ci.yml` and `deploy.yml` to run the generate step ahead of the deploy step for `public-site`.

### Vetted font shortlist

A single constant in `packages/framework/src/tokens/fonts.ts` listing the v1 vetted Google Fonts:

- **Display**: Inter, Manrope, Fraunces, Playfair Display, Space Grotesk, DM Serif Display, Outfit, Sora
- **Body**: Inter, Source Sans 3, IBM Plex Sans, Lora, Merriweather, Work Sans

The shortlist is consulted by the AI when proposing fonts; sites may reference fonts by id. Adding/removing entries is a framework iteration, not a per-site choice.

## Explicitly NOT in this ticket

- Real form handler — REQ-7 (D1 INSERT, Resend notification, Turnstile verification).
- D1 schema, migrations, or bindings on `public-site` — REQ-7.
- The control-app: builder UI, portal, authenticated endpoints. Separate later REQs.
- D1-backed site definitions for customer sites — `tools/generate` is file-backed in this REQ.
- Privacy / terms pages (referenced in the footer) — placeholders; content can land via a follow-up small REQ.
- Image generation or stock-image library — operator provides any images.
- Preview deploys per PR — REQ-1 explicit non-goal still stands.
- Sitemap / robots.txt — small enough to fold into this REQ if trivial; otherwise follow-up.

## Test approach (UATs)

- `test_UAT_FC_REQ-6_generator_validates_site_def_against_schema` — invalid site def causes generator to exit non-zero with a useful error.
- `test_UAT_FC_REQ-6_generator_emits_index_html_with_all_module_anchors` — built output for `sites/1stcontact` contains anchor ids for each module instance.
- `test_UAT_FC_REQ-6_generator_emits_per_site_css_with_theme_tokens` — generated CSS contains the theme's `--color-primary` value.
- `test_UAT_FC_REQ-6_generator_copies_assets_to_output` — image assets present in `--out`.
- `test_UAT_FC_REQ-6_generator_preloads_configured_fonts` — `<head>` contains `<link rel="preload">` for the site's fonts.
- `test_UAT_FC_REQ-6_public_site_serves_generated_index` — `wrangler.unstable_dev` on `apps/public-site`, GET `/` returns 200 with the generated HTML.
- `test_UAT_FC_REQ-6_public_site_serves_generated_css` — GET the linked CSS path returns 200 and contains expected token declarations.
- `test_UAT_FC_REQ-6_form_stub_accepts_valid_post` — POST `/api/forms/contact` with valid JSON returns 200 with `{success:true}`.
- `test_UAT_FC_REQ-6_form_stub_rejects_invalid_content_type` — non-JSON content-type returns 400.
- `test_UAT_FC_REQ-6_form_stub_swallows_honeypot_submission` — POST with honeypot field filled returns 200 but is silently dropped (verified by assertion in the response body distinguishing "accepted" vs "logged").
- `test_UAT_FC_REQ-6_public_site_returns_404_for_unknown_path`
- `test_UAT_FC_REQ-6_deploy_workflow_runs_generate_before_deploy` — `.github/workflows/deploy.yml` YAML check: generate step precedes wrangler deploy for `public-site`.

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome + tokens), REQ-5 (framework content modules).
- **Unblocks**:
  - REQ-7 (lead-capture pipeline) — replaces the stub `/api/forms/contact` with a real handler.
- **Operator follow-ups** (no code):
  - Finalize hero/manifesto/services/founder-note copy.
  - Provide real assets (hero image, logo, founder portrait if used).
  - Confirm SEO metadata and og:image.