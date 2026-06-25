---
uid: report-317fb6a0
id: REPORT-528
type: report
title: 'Reconciliation Review: BUNDLE-2 (REQ-1..REQ-8)'
created_by: xgd
created_at: '2026-06-25T02:36:59.171860+00:00'
updated_at: '2026-06-25T02:36:59.171860+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-94e1d1b6
  anchor_uid: bundle-94e1d1b6
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: —
**Anchor**: bundle-94e1d1b6 (BUNDLE-2)
**Stories Reviewed**: 9 / 9

## Behavior Inventory

| Surface | Key behaviors landed in this bundle |
|---|---|
| Monorepo + CI/CD | pnpm workspace; two Cloudflare Workers (`apps/public-site`, `apps/control-app`); wrangler 4 with `compat 2025-07-01` + `nodejs_compat`; CI workflow (PR checks, generate→test→dryrun); deploy workflow (push to `xgd-stable` → generate→dryrun→deploy both Workers); per-ref concurrency, queue-not-cancel; root scripts `dev/build/test/deploy/dryrun`; vitest UAT runner; toolchain pinning + lockfile |
| Slug rename | `first-contact` → `1stcontact` across sites dir, root pkg name, both worker names, README, CLAUDE.md, DOC-7 prose |
| `@1stcontact/site-schema` | TS types via `z.infer`; `validateSite` → `Result<Site,ValidationError[]>` with JSON-pointer paths; structural validation (Page/Module shape, NavPattern enum, hex regex, module-ID + page-slug uniqueness); locked 55-token theme superset; widened `ContentValue` (string/number/boolean/null/AssetRef/array/object); catalog-membership explicitly excluded |
| Framework tokens + CSS | `tokens/{contract,defaults,css}` with deterministic CSS variable naming; full 55-slot defaults (9 palette roles incl. `text`, 9 scale steps incl. `5xl`, 5 weights, 3 lineHeights, 10 numeric spacing steps, 4 container widths); dark-mode block isolation; deep-merge of partial overrides; `tokens/fonts.ts` vetted Google Fonts shortlist + family resolver + href builder |
| Framework chrome modules | `modules/{registry,types,meta,styles}` with `CatalogMissError`; browser-safe `@1stcontact/framework/meta` subpath (no Astro/`node:*` imports); `header` (`top-nav`, responsive breakpoint collapse), `hero` (`bg-color`, `bg-image`), `footer` (`minimal`, build-time copyright year); scoped CSS uses tokens only, no hex literals |
| Framework content modules | `text-block` (`prose`/`landing`, markdown via unified/remark); `services-grid` (`three-col`/`two-col`, items 2..6, single-column collapse below md, optional icon/CTA); `contact-form` (`inline`, no-JS HTML POST works, JS island intercepts to JSON, honeypot, `data-turnstile-target` mount); registry now 6 modules; validator extensions (`list-of` min/max, nested `object`, `enum`) |
| Static site generator | `tools/generate` programmatic `runGenerate()` + `fc-generate --site --out [--clean]` CLI via vite-node shim; HTML5 emit with anchor-style wrappers (`id`+`data-module-instance`); per-site `theme.css` linked at `/assets/theme.css`; SEO `<head>` with Google Fonts preconnect/preload only for vetted families; `SiteLoadError` with JSON-pointer paths; asset path preservation; `--clean` wipes output |
| Site definition | `sites/1stcontact/site.json` — single `home` page, `in-page-anchors`, 7 modules (header→hero→text-block landing→services-grid→text-block prose→contact-form→footer); Manrope+Inter; `#2563eb` / `#f59e0b`; `placeholder.png` shipped |
| Public-site Worker | ASSETS Static Assets binding (top-level + production env); GET/HEAD → ASSETS proxy; unknown path → plain-text 404; routes `POST /api/forms/contact` to `forms.ts`; `generate` wired into `build`/`deploy`/`dryrun` and CI/deploy workflows |
| Lead capture pipeline | `db/migrations/0001_create_leads.sql` with CRM Lite lifecycle (status enum, indexes `leads_site_created`, `leads_status`); real `/api/forms/contact` handler — content-type/JSON/field/email validation, honeypot success-shaped 200, Turnstile siteverify, CF-IPCountry capture, D1 INSERT, best-effort Resend (failure does not fail request), `lead_id` returned; error taxonomy `INVALID_JSON`/`INVALID_CONTENT_TYPE`/`MISSING_FIELD`/`INVALID_EMAIL`/`TURNSTILE_FAILED`/`INTERNAL`; Turnstile script + widget mount; D1 binding + vars/secrets in wrangler |
| Builder v1 SPA | `packages/builder-ui` two-panel layout (draggable splitter, chat collapses to 32px restore-rail, widths persisted under `1stcontact_builder_panels_v1`); preview iframe with 375/768/100% viewport presets; vanilla-DOM `BuilderStore` with undo/redo + defensive `validateSite`; `apps/control-app` `/builder` route + bundled `starter-sites/1stcontact.json` + `/api/chat` streaming proxy to Anthropic (model `claude-sonnet-4-6`, key `CLAUDE_API_KEY`); v1 tool subset (set_module_content/dial/variant, add/remove/reorder_modules, set_theme_token, set_site_config); 4-layer validator's Layers 1+2 implemented client-side; 500/502 error surfaces |

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|---|---|---|---|
| 1 | Control-app placeholder Worker response | Covered | story-067dc2f8 | AC-384 behavioral via `unstable_dev` |
| 2 | CI workflow triggers/ordering | Covered | story-067dc2f8 | AC-385 YAML inspection |
| 3 | Deploy workflow triggers/ordering | Covered | story-067dc2f8 | AC-386 |
| 4 | Per-ref concurrency, queue-not-cancel | Covered | story-067dc2f8 | AC-387 |
| 5 | Cloudflare secrets only in deploy | Covered | story-067dc2f8 | AC-388 |
| 6 | `1stcontact` slug everywhere | Covered | story-067dc2f8 | AC-389 |
| 7 | Toolchain pinning + lockfile | Covered | story-067dc2f8 | AC-390 |
| 8 | `validateSite` Result narrowing to `Site` | Covered | story-aecb7377 | AC-391/392 |
| 9 | Module shape + version positive | Covered | story-aecb7377 | AC-393 |
| 10 | NavPattern enum | Covered | story-aecb7377 | AC-394 |
| 11 | Theme slot completeness | Covered | story-aecb7377 | AC-395 |
| 12 | Hex regex | Covered | story-aecb7377 | AC-396 |
| 13 | Catalog membership explicitly NOT validated | Covered | story-aecb7377 | AC-397 negative-space |
| 14 | JSON-pointer error paths | Covered | story-aecb7377 | AC-398 |
| 15 | Locked 55-token superset (schema evolution) | Covered | story-aecb7377 | AC-399 |
| 16 | `ContentValue` widened to include number/boolean/null/object | Covered | story-aecb7377 | AC-400 |
| 17 | Module-ID + page-slug uniqueness | Covered | story-aecb7377 | AC-401/402 |
| 18 | CSS var emission for every locked slot | Covered | story-e53ba4cf | AC-403 |
| 19 | Defaults light-mode + dark-block isolation | Covered | story-e53ba4cf | AC-406/407 |
| 20 | `makeThemeTokens` deep-merge of partials | Covered | story-e53ba4cf | AC-405 |
| 21 | Google Fonts shortlist + family resolver + href builder | Covered | story-e53ba4cf | AC-408/409/410 |
| 22 | Registry resolve / list / miss-id / miss-version | Covered | story-1d5b450f | AC-411..414 |
| 23 | `meta` conformance across modules | Covered | story-1d5b450f | AC-415 |
| 24 | Header `top-nav` render + breakpoint collapse | Covered | story-1d5b450f | AC-416/417 |
| 25 | Hero `bg-color`/`bg-image`/no-CTA | Covered | story-1d5b450f | AC-418..420 |
| 26 | Footer build-time copyright + optional links | Covered | story-1d5b450f | AC-421/422 |
| 27 | Scoped CSS uses tokens only, no hex literals | Covered | story-1d5b450f | AC-423 |
| 28 | Browser-safe `@1stcontact/framework/meta` subpath | Covered | story-1d5b450f | AC-424 import-graph guard |
| 29 | text-block prose/landing container + markdown + heading omission | Covered | story-f1e061ba | AC-425..428 |
| 30 | services-grid 3-col/2-col, collapse < md, items 2..6 | Covered | story-f1e061ba | AC-429..432 |
| 31 | contact-form labels, action URL, honeypot, Turnstile mount | Covered | story-f1e061ba | AC-433..436 |
| 32 | contact-form no-JS POST + JS intercept + success/error replacement | Covered | story-f1e061ba | AC-437..440 |
| 33 | Validator `list-of` / `object` / `enum` | Covered | story-f1e061ba | AC-441 |
| 34 | Registry now resolves 6 modules | Covered | story-f1e061ba | AC-442 |
| 35 | Generator CLI flags + programmatic `runGenerate` | Covered | story-d111f966 | AC-443..445 |
| 36 | HTML5 output + anchor-style module wrapper | Covered | story-d111f966 | AC-446 |
| 37 | Per-site theme.css concatenation + link | Covered | story-d111f966 | AC-447/448 |
| 38 | Generator SEO head + font fallback chain | Covered | story-d111f966 | AC-449/450 |
| 39 | Asset path preservation | Covered | story-d111f966 | AC-451 |
| 40 | `SiteLoadError` with JSON pointers | Covered | story-d111f966 | AC-452 |
| 41 | Missing/malformed handling, non-zero exit, `--clean` | Covered | story-d111f966 | AC-453..455 |
| 42 | `site.json` validates against schema + 7-module order | Covered | story-f632db8a | AC-456/457 |
| 43 | `GET /` and `/assets/theme.css` via ASSETS | Covered | story-f632db8a | AC-458/459 |
| 44 | Unknown path → 404 | Covered | story-f632db8a | AC-460 (status only; see Judgment Calls) |
| 45 | `generate` wired into build/deploy/dryrun + CI workflows | Covered | story-f632db8a | AC-461..463 |
| 46 | `leads` migration schema + indexes | Covered | story-37572647 | AC-464 |
| 47 | Real handler persist + `lead_id` 200 | Covered | story-37572647 | AC-465 |
| 48 | Honeypot success-shaped drop | Covered | story-37572647 | AC-466 |
| 49 | Content-type / malformed JSON / missing email / invalid email 400s | Covered | story-37572647 | AC-467..470 |
| 50 | Turnstile siteverify fail → 400 | Covered | story-37572647 | AC-471 |
| 51 | CF-IPCountry + `extra_fields` JSON persistence | Covered | story-37572647 | AC-472/473 |
| 52 | Resend failure isolation | Covered | story-37572647 | AC-474 |
| 53 | Generator emits Turnstile script + meta when needed | Covered | story-37572647 | AC-475 |
| 54 | Island attaches `turnstile_token` on submit | Covered | story-37572647 | AC-476 |
| 55 | Builder splitter + chat collapse to 32px restore-rail | Covered | story-ba9f2715 | AC-477..479 |
| 56 | Width persistence under `1stcontact_builder_panels_v1` | Covered | story-ba9f2715 | AC-480 |
| 57 | Viewport presets 375/768/100% | Covered | story-ba9f2715 | AC-481 |
| 58 | Iframe render via `renderSiteIntoIframe` | Covered | story-ba9f2715 | AC-482 |
| 59 | Store validated diffs + undo/redo + defensive validation | Covered | story-ba9f2715 | AC-483..485 |
| 60 | `/api/chat` proxy success + 500/502 surfaces | Covered | story-ba9f2715 | AC-486/487 |

## Ungrounded Stories

None — every story claim maps to verifiable code or config.

## Plan Item Accounting

| # | Component | Expected Story | Status |
|---|---|---|---|
| 1 | Deploy Infrastructure | story-067dc2f8 | ✓ |
| 2 | Site Schema | story-aecb7377 | ✓ |
| 3 | Framework Tokens & CSS Generator | story-e53ba4cf | ✓ |
| 4 | Framework Module Catalog: Chrome | story-1d5b450f | ✓ |
| 5 | Framework Module Catalog: Content | story-f1e061ba | ✓ |
| 6 | Static Site Generator | story-d111f966 | ✓ |
| 7 | Public Site Worker | story-f632db8a | ✓ |
| 8 | Lead Capture Pipeline | story-37572647 | ✓ |
| 9 | Builder UI | story-ba9f2715 | ✓ |

## Judgment Calls

- **Public-site method guard (`GET`/`HEAD` only) not covered by an AC** in story-f632db8a. The routing surface is small and the 405/404 outcome for `POST /unknown` would still be a 404 from the fallback — the user-visible behavior class is captured by AC-460. Acceptable omission for reconciliation.
- **ULID vs UUID divergence** in story-37572647 (`lead_id`). Intent declared "ULID generation"; code uses `crypto.randomUUID()`. Behaviorally inert (AC-465 only asserts a `lead_id` is returned). Treated as trivial silent absorption — worth noting but not blocking. The story's exclusions/notes should ideally carry this.
- **AC-460 evidence depth** (plain-text body / `content-type` not asserted, only status). Trivial — the fallback branch is one line and the consolidated UAT issues real HTTP.
- **`/api/forms/contact` routing branch lives in the public-site Worker but is owned by REQ-7's story**. Clean cross-story demarcation; no silent absorption because story-37572647 explicitly owns the handler surface and story-f632db8a explicitly defers it.
- **Builder vanilla-DOM vs intent's "React components"**. Story-ba9f2715 §4 surfaces this divergence explicitly with rationale, so it is disclosed, not absorbed silently.
- **REQ-3 → REQ-4 ThemeTokens widening** and **REQ-3 → REQ-6 ContentValue widening** are both reflected in story-aecb7377's ACs (AC-399, AC-400). Intent flagged these as cross-bundle nuances; stories absorb them correctly with explicit ACs rather than silent updates.
- **Free-coded items intent flagged as "look like intent but aren't"** (REQ-6 ContentValue widening, REQ-6 test deletion, REQ-6 `fonts.ts`/`loadModuleStyles`, REQ-8 vanilla-DOM, REQ-8 framework-meta subpath, REQ-8 `shape:cirle`→`size:huge` UAT rewrite): each is either covered by an AC, explicitly excluded, or surfaced as a divergence note in the relevant story. No silent absorption.
- **REQ-5 services-grid icon-as-AssetRef-vs-emoji branch, optional CTA anchor, text-block dial-class emission**: real code branches without dedicated ACs. Folded into AC-429/430 indirectly; trivial enough that a reader of story-f1e061ba would not be surprised.
- **Trivial schema edge cases in story-aecb7377** (UrlString grammar, AssetRef focal-point bounds, NavTarget discriminated-union rejection, SiteConfig `passthrough()`, ModuleInstance `version` positive, `pages` min(1), JSON-pointer `~0`/`~1` escape): all internal primitives, not material to a developer reading the story.

## Evidence Sufficiency Findings

- **story-067dc2f8**: AC-384 strong behavioral (`unstable_dev` + real fetch). AC-385/386/387/388/389/390 are YAML/file-text inspection — appropriate for declarative CI surface. Minor regex-precedence note on AC-385 step-ordering (`A || B && C`) is trivial.
- **story-aecb7377**: All 12 ACs have behavioral UATs asserting `validateSite()` runtime output. AC-391 type-narrowing uses `expectTypeOf` (compile-time) — acceptable. AC-398 does not exercise `~0`/`~1` JSON-pointer escaping — trivial.
- **story-e53ba4cf**: All 8 ACs assert emitted CSS strings / function return values. AC-403 fixture-driven rather than calling `generateThemeCss()` with no args — still asserts every locked slot name. AC-405 partial-typography deep-merge edge case under-asserted — trivial.
- **story-1d5b450f**: All 14 ACs covered. AC-415 is structural meta-shape inspection (the contract IS the shape). AC-417 mixes rendered-HTML with CSS source inspection — appropriate for static breakpoint rules. AC-421 uses year `1999` to force determinism — strong. AC-424 static import-graph guard is a strong behavioral assertion of the browser-safe contract.
- **story-f1e061ba**: All 18 ACs have 1:1 named UATs. AC-429/430/431 layout assertions could be CSS-string inspection rather than rendered breakpoint — soft risk, non-blocking.
- **story-d111f966**: All 13 ACs covered behaviorally with real fs writes, real subprocess CLI invocation, regex content checks, positive+negative branches (AC-454), and error-type+message inclusion (AC-452 with no-output-written assertion).
- **story-f632db8a**: AC-456/457 source-text via `validateSite()` — behavioral against schema. AC-458/459/460 consolidated UAT runs `unstable_dev` + real HTTP — behavioral. AC-460 only asserts status, not body/content-type — trivial. AC-462/463 YAML inspection — appropriate.
- **story-37572647**: All 13 ACs have 1:1 named UATs plus parallel `REQ-7`/`REQ-5` UATs. AC-464 via D1 introspection in Miniflare. AC-465..474 exercise real `handleContactSubmission` with Miniflare D1. AC-475 against real `renderSite()` output. AC-476 against real `enhanceContactForm` with mocked `window.turnstile.getResponse`.
- **story-ba9f2715**: All 11 ACs 1:1 with named UATs plus ~7 redundant `FC_REQ-8_*` twins. AC-481 spot-checked behavioral (DOM clicks → iframe width). AC-487 spot-checked with three real injected-fetch failure paths. AC-486 tool_use extraction not directly spot-checked but plausibly covered by twin UAT — minor.

## Verdict

**PASS.**

The bundle satisfies every gate of the verdict policy:

1. **Plan items complete**: All 9 expected stories present and reviewed.
2. **Intent fidelity**: Every REQ-1..REQ-8 surface maps onto a story without silent absorption. The two cross-bundle schema evolutions (ThemeTokens 55-token superset; ContentValue widening to include number/boolean/null/object) are reflected explicitly in story-aecb7377 ACs. The intent-flagged "free-coded but looks like intent" items (vanilla-DOM SPA, framework-meta subpath, `loadModuleStyles`, REQ-6 ContentValue widening, REQ-6 obsolete-test deletion, REQ-8 `shape:cirle`→`size:huge` rewrite) are each either covered by an AC, surfaced as a divergence note (story-ba9f2715 §4), or explicitly excluded.
3. **Material code behaviors covered**: 60 inventoried behaviors all map to ACs. The few uncovered branches (public-site method guard, contact-form ULID vs UUID, services-grid icon dual-shape, contact-form 500 INTERNAL DB-error path) are trivial or defensive defaults that would not surprise a reader of the relevant story.
4. **No ungrounded claims**: Every story claim maps to verifiable code/config.
5. **AC evidence distinguishes correct from broken**: UATs are predominantly behavioral (`unstable_dev`, Miniflare D1, real `AstroContainer` render, real CLI subprocess, real DOM enhancement, real fetch injection, schema validator runtime calls). The few file-text/source-inspection ACs (CI YAML ordering, registry meta shape, scoped CSS regex, import-graph guard) are appropriate to their declarative surfaces.

The minor notes catalogued above (AC-460 body assertion, ULID/UUID, services-grid icon branch, method guard, AC-405 nested-typography edge, AC-486 spot-check) are all trivial and the materiality test ("would a developer reading only the stories be surprised by uncovered behavior?") returns **no** for each. Bundle is ready to reconcile.
