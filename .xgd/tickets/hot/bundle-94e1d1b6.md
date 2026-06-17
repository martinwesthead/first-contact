---
uid: bundle-94e1d1b6
id: BUNDLE-2
type: bundle
title: REQ-1 + REQ-2 + REQ-3 + REQ-4 + REQ-5 + 3 more
created_by: xgd
created_at: '2026-06-15T22:41:00.241973+00:00'
updated_at: '2026-06-17T20:49:10.591969+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  commits:
  - ac174d821cee8ef8dd6af126e9c2ca2db53b2ddc
  - f53c97229b5b6a1c01a644e990bf079aefa4b422
  - e34f13e23054bab8c4c4e9457601b24aec62de1b
  - d4f8e4d5b09dec5fd803a52c2aaad69875370b68
  - 1befb476d98636a3b74ed88d216de7a0bd100bff
  - bce23fdc1d1d393cfe65b73593a0e5c140341def
  - fa4194443ca762e1c2782de4e281ffcb3e29a910
  - 0b1ba59f9b630b6616526cdc42cd0904a41f5221
  auto_merge_back: true
  priority: medium
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-1: Monorepo: scaffold workspace + two-Worker Cloudflare deploy pipeline

## Scope

Stand up the empty bones of the 1stcontact.io platform: a pnpm monorepo with two Cloudflare Worker apps, scaffolding for all future packages, and a GitHub Actions workflow that auto-deploys both Workers on every push to `xgd-stable`.

Design discussion: see CHAT-10 (Project Build and Deploy), CHAT-7 (Framework), CHAT-9 (Builder).

## Why free-coded

Scaffolding/infrastructure work — no algorithmic design needed, just the right files in the right places. Small, cohesive, single intent.

## What shipped

### Repo shape

```
first-contact/
├── apps/
│   ├── public-site/       Worker for 1stcontact.io (placeholder response)
│   └── control-app/       Worker for app.1stcontact.io (placeholder response)
├── packages/
│   ├── framework/         (package.json + README placeholder)
│   ├── site-schema/       (package.json + README placeholder)
│   ├── builder-ui/        (package.json + README placeholder)
│   └── ui-kit/            (package.json + README placeholder)
├── sites/
│   └── first-contact/     (README placeholder)
├── tools/
│   └── generate/          (package.json + README placeholder)
├── db/migrations/         (empty, with .gitkeep)
├── tests/                 (vitest UAT suite)
├── .github/workflows/
│   ├── ci.yml             PR checks: install + build + test + dry-run deploys
│   └── deploy.yml         push to xgd-stable: deploy both Workers (production env)
├── pnpm-workspace.yaml
├── package.json           Root workspace + scripts
├── tsconfig.base.json     Shared TS config
└── vitest.config.ts       Test runner config
```

### Worker placeholders

- `apps/public-site/src/index.ts`: returns `"Hello from 1stcontact.io"` (text/plain, 200)
- `apps/control-app/src/index.ts`: returns `"Hello from app.1stcontact.io"` (text/plain, 200)
- Each app has its own `wrangler.toml`:
  - `public-site` production env: `1stcontact.io/*` on the 1stcontact.io zone
  - `control-app` production env: `app.1stcontact.io/*`
  - Both: `compatibility_date = "2025-07-01"` (latest supported by wrangler 3.114.17 runtime; bump when wrangler v4 lands)
  - Both: `compatibility_flags = ["nodejs_compat"]`
  - Both: `workers_dev = true` (default `.workers.dev` URL available)
  - No D1/R2/KV bindings yet (separate tickets)

### Root scripts (package.json)

- `pnpm dev` — runs `wrangler dev` for both Workers in parallel via concurrently (ports 8787 / 8788)
- `pnpm dev:public` / `pnpm dev:control` — individual
- `pnpm -r build` — workspace-wide build (Workers tsc --noEmit; placeholder packages echo)
- `pnpm test` — vitest run across all UATs
- `pnpm deploy:public` / `pnpm deploy:control` — manual deploy escape hatch
- `pnpm dryrun:public` / `pnpm dryrun:control` — used by CI workflow

Node 20+ and pnpm 9+ required (engines field). pnpm provisioned via corepack from `packageManager` field. `pnpm-lock.yaml` committed for `--frozen-lockfile` reproducibility.

### GitHub Actions

**`.github/workflows/deploy.yml`**: triggered on `push` to `xgd-stable` plus manual dispatch. Steps:
1. Checkout, pnpm/action-setup@v4 (v9), setup-node@v4 (Node 20), pnpm install --frozen-lockfile
2. `pnpm -r build`
3. `pnpm --filter @1stcontact/public-site exec wrangler deploy --env production`
4. `pnpm --filter @1stcontact/control-app exec wrangler deploy --env production`

Uses `concurrency: deploy-${{ github.ref }}` to serialize.

Secrets required (set manually before first deploy works):
- `CLOUDFLARE_API_TOKEN` — scopes: Account → Workers Scripts:Edit, Account → D1:Edit, Account → Workers R2 Storage:Edit, Zone → Workers Routes:Edit on the 1stcontact.io zone
- `CLOUDFLARE_ACCOUNT_ID`

**`.github/workflows/ci.yml`**: triggered on PRs against main / xgd-working / xgd-stable, plus manual dispatch. Steps: checkout, install, `pnpm -r build`, `pnpm test`, `pnpm dryrun:public`, `pnpm dryrun:control`.

## Explicitly NOT in this ticket

- D1 database creation, schema, or migrations
- R2 buckets or KV namespaces
- Framework package code (section library, renderer, theme tokens)
- Builder SPA implementation
- Real FC homepage content / static generator
- Preview deploys for PRs
- Wrangler v4 upgrade (v3.114.17 shipped; v4 changes the `unstable_dev` testing API)

## Test approach (UATs)

UAT runner: vitest 2 (devDep at root).

- `test_UAT_FC_REQ-1_public_site_returns_placeholder` — uses `unstable_dev` from wrangler to boot `apps/public-site`, fetches `/`, asserts 200 + body `Hello from 1stcontact.io` + `text/plain` content-type.
- `test_UAT_FC_REQ-1_control_app_returns_placeholder` — same for `apps/control-app` (body `Hello from app.1stcontact.io`).
- `test_UAT_FC_REQ-1_deploy_workflow_lints` — parses `.github/workflows/deploy.yml` with the `yaml` lib and asserts: (1) triggers on push to `xgd-stable`, (2) has a concurrency group, (3) exposes both Cloudflare secrets to the deploy job env, (4) invokes `wrangler deploy` for both `@1stcontact/public-site` and `@1stcontact/control-app`.
- `test_UAT_FC_REQ-1_ci_workflow_lints` — parses `.github/workflows/ci.yml` and asserts: (1) triggers on `pull_request`, (2) runs `dryrun:public` and `dryrun:control`, (3) runs `pnpm test`.

## Verification

- `pnpm test` — 4 test files, 9 tests, all passing in ~700ms
- `pnpm -r build` — clean across all 7 buildable packages
- `pnpm dryrun:public` and `pnpm dryrun:control` — both succeed, bundles 21.5 KiB / 5.1 KiB gzip

## Follow-up tickets (not in scope)

- Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets (operator task, no code)
- D1 schema v0 + bindings on both Workers
- Framework Phase 0: section library + renderer (CHAT-7)
- Static generator (`tools/generate`) reading `sites/first-contact/` definition
- Builder SPA (CHAT-9)


---

## REQ-2: Rename code identifiers from first-contact to 1stcontact to align with domain

## Scope

Domain registered as `1stcontact.io`. GitHub repo already renamed from `first-contact` to `1stcontact`. This ticket covers aligning code/config slugs in the working tree so they match the new domain/repo convention.

## Concrete changes

1. Rename `sites/first-contact/` → `sites/1stcontact/` (single README inside)
2. `sites/1stcontact/README.md`: update heading `# sites/first-contact` → `# sites/1stcontact`
3. `package.json`: `"name": "first-contact"` → `"name": "1stcontact"` (root monorepo package name only — does not affect any package consumer; `apps/*`, `packages/*`, `tools/*` already use `@1stcontact/...` scope)
4. `apps/control-app/wrangler.toml`: worker name `first-contact-control-app` → `1stcontact-control-app`
5. `apps/public-site/wrangler.toml`: worker name `first-contact-public-site` → `1stcontact-public-site`
6. `CLAUDE.md`: heading `# Claude Instructions for first-contact` → `# Claude Instructions for 1stcontact`

## Out of scope

- Project directory rename (`/Users/martin/Projects/first-contact` → ...) — user will do later
- Display name "First Contact" → "1st Contact": no occurrences in code/docs found (only inside `.xgd/tickets/`, which is a ticketing internal and not touched directly)

## Behaviour validation

This is a rename / config slug change with no runtime logic to UAT:
- `sites/` is not in `pnpm-workspace.yaml` (only `apps/*`, `packages/*`, `tools/*`), so the directory rename has no workspace impact
- Wrangler `name` only affects the deployed worker identifier; routes (already `1stcontact.io`) are unchanged
- Root `package.json` `name` is private and not published

Verification: `pnpm install --frozen-lockfile=false` resolves cleanly, `pnpm -r build` continues to pass (TBC after change).


## Update: doc-ab7508c1 included

Architecture doc DOC-7 (`doc-ab7508c1`) also updated to match:
- Title "First-Contact Website Framework" → "1st Contact Website Framework"
- Prose mentions of "first-contact" (the product) → "1st Contact"
- Path/tree references (`sites/first-contact`, repo root `first-contact/`) → `1stcontact` slug

Pushed via `xgd ticket update --body-file` (auto-commit `a7cb585`).


---

## REQ-3: site-schema package: types + runtime validation for site definitions

## Scope

Build the `@1stcontact/site-schema` package: TypeScript types and runtime validation for site definitions. This is the foundational data contract that every other framework package and consumer (`packages/framework`, `tools/generate`, `apps/control-app`, eventually the D1 site_definitions table) imports.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §2 (Composition Model), §3 (Module Contract), §4 (Theme Token System), and §5 (Navigation Patterns).

## Why free-coded

Foundational data shape — narrow, well-specified, one cohesive unit. No algorithmic design, just translating DOC-7's hierarchy into TypeScript + a runtime validator. Future schema evolution will go through normal versioning, not free-coding.

## Deliverables

### Types (`packages/site-schema/src/types.ts`)

TypeScript types mirroring DOC-7 §2.1:

```typescript
Site                  // top-level
SiteConfig            // business profile, contact, integrations
ThemeTokens           // palette, typography, spacing, radius, shadow, containers, breakpoints
NavConfig             // pattern + entries
NavPattern            // 'in-page-anchors' | 'top-tabs' | 'top-tabs-dropdown' | 'hamburger' | 'footer-only'
NavEntry              // label + target (PageRef | AnchorRef | UrlRef)
Page                  // id, path, title, seoMeta, modules[]
ModuleInstance        // type, version, variant, dials, content
Dials                 // Record<string, string>
ModuleContent         // Record<string, ContentValue>
ContentValue          // string | MarkdownString | AssetRef | UrlString | ContentValue[] | EnumValue
AssetRef              // id, src, alt, focalPoint
SeoMeta               // title, description, ogImage
```

Types are derived from the Zod schemas (single source of truth via `z.infer`).

### Schema (`packages/site-schema/src/schema.ts`)

Zod schemas matching every type above. Validation enforces:

- Required shape of Site, Page, ModuleInstance
- Field types (`string`, `number`, hex color, URL, etc.)
- Universal enums: `NavPattern`, content-value primitive types
- Theme token slot completeness — every token slot defined in DOC-7 §4 is present with a value of the correct primitive type

The schema does **not** validate catalog membership — whether `type: 'hero'` is a real module, or whether `'image-left'` is a valid variant for `photo-text`, is the framework's responsibility at render time using `moduleMeta`. The schema validates structure; the framework validates catalog-correctness.

### Validator (`packages/site-schema/src/validate.ts`)

```typescript
export function validateSite(input: unknown): Result<Site, ValidationError[]>
```

Returns a discriminated union: `{ok: true, value: Site}` or `{ok: false, errors: ValidationError[]}`. Each error includes a JSON-pointer-style path and human-readable message.

### Package wiring

- `packages/site-schema/package.json` — `"main"`, `"types"`, `"exports"`, dependency on `zod`
- `packages/site-schema/tsconfig.json` — extends `tsconfig.base.json`, emits `dist/`
- Built artifacts under `dist/`; sources under `src/`
- Pure ESM

## Explicitly NOT in this ticket

- Catalog validation (module type / variant / dial / content-field correctness against a module's `moduleMeta`) — that belongs in `packages/framework`.
- Theme token *values* or *defaults* — only the slot contract here; defaults live in `packages/framework`.
- JSON Schema export (for use by external tools or Astro content collections) — can be added later via `zod-to-json-schema` if needed.
- The site-definition file format itself (JSON vs YAML vs TOML) — the schema validates parsed objects; format choice belongs to `tools/generate`.
- Any module-specific schemas — each module declares its own `contentSchema` in `moduleMeta`.

## Test approach (UATs)

Runner: vitest. Files under `tests/` matching the existing convention.

- `test_UAT_FC_REQ-3_valid_minimal_site_validates` — smallest possible Site (one page, one module) passes.
- `test_UAT_FC_REQ-3_valid_full_site_validates` — Site exercising every slot (theme tokens, nav, multiple modules, assets) passes.
- `test_UAT_FC_REQ-3_invalid_module_instance_shape_rejected` — ModuleInstance missing `type` or `version` produces a `ValidationError` with the expected path.
- `test_UAT_FC_REQ-3_invalid_nav_pattern_rejected` — Nav pattern not in the enum rejected.
- `test_UAT_FC_REQ-3_theme_tokens_missing_slot_rejected` — A required token slot omitted rejected with the slot path.
- `test_UAT_FC_REQ-3_invalid_color_format_rejected` — Non-hex color in a color token slot rejected.
- `test_UAT_FC_REQ-3_validator_returns_typed_site` — On success, TS narrows to `Site` (compile-time test via `expectTypeOf`).
- `test_UAT_FC_REQ-3_catalog_membership_not_validated` — Site with unknown module `type` value still passes schema validation (catalog check is the framework's job). Documents the boundary.

## Dependencies / follow-up tickets

- **Depends on**: REQ-1 (monorepo scaffold), REQ-2 (1stcontact rename).
- **Unblocks**:
  - REQ-4 (framework chrome modules + tokens + CSS generator) — imports types from this package.
  - REQ-5 (framework content modules) — imports types from this package.
  - REQ-6 (`tools/generate` + site definition + wire `public-site`) — imports validator.



## Implementation decisions (free-coding session 2026-06-12)

Decisions agreed up-front to lock the schema shape so future migrations are deliberate, not accidental:

### Theme token slots

DOC-7 §4.1 enumerates token *categories* but not specific slots. Locked slot list:

- `palette` — `primary`, `accent`, `fg`, `bg`, `surface`, `surfaceSubtle`, `surfaceInverse`, `border`, `muted` (hex strings)
- `typography.family` — `heading`, `body` (CSS font-family stacks, plain strings)
- `typography.scale` — `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl` (CSS length strings)
- `spacing` — `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (CSS length strings; matches DOC-7 §3.1 spacing dial enum)
- `radius` — `none`, `sm`, `md`, `lg`, `full` (CSS length strings)
- `shadow` — `none`, `sm`, `md`, `lg` (CSS shadow value strings)
- `container.maxWidth` — single CSS length string
- `breakpoints` — `sm`, `md`, `lg`, `xl` (CSS length strings)

All slots are required (per ticket: missing slot rejected).

### Other shape decisions

- `ModuleInstance.id` — required string, unique within its page. Needed for nav anchors per DOC-7 §5 (`in-page-anchors` pattern targets module IDs).
- `Page.slug` — required string, unique within site.
- `NavEntry.target` — discriminated union by `kind`: `{ kind: 'page', pageId }`, `{ kind: 'anchor', pageId, moduleId }`, `{ kind: 'url', href }`.
- `AssetRef` — `{ id, src, alt, focalPoint?: { x: number, y: number } }`, focal point coordinates `0..1`.
- `MarkdownString` — branded `string` at compile time, plain string at runtime (no parsing in this package).
- Hex color regex — `#rgb` / `#rrggbb` / `#rrggbbaa`.
- Structural validations (module ID uniqueness within page; page slug uniqueness within site) are in the schema per DOC-7 §6.5 layer 1. Catalog membership (is `'hero'` a real module type?) is NOT — that's the framework's job at render time.


---

## REQ-4: Framework: theme tokens, CSS generator, module registry, chrome modules (header/hero/footer)

## Scope

Build out `packages/framework` with: the theme token defaults + CSS generator, the module registry contract, and the three chrome modules (`header`, `hero`, `footer`). After this REQ a "skeleton site" — top nav, hero section, footer — can render via the module catalog with token-driven styling. Content modules follow in REQ-5.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §3 (Module Contract), §4 (Theme Token System), and §5 (Navigation Patterns).

## Why free-coded

The token system + first three modules form one cohesive unit: each module exercises the same contract, the CSS generator wires their token references, and together they prove the model end-to-end before content modules build on it. Pure construction; design is already locked in DOC-7.

## Token surface

The framework's theme tokens are the **superset** of REQ-3's `ThemeTokens` and the surface locked in chat. `packages/site-schema` is the single source of truth for the shape — `packages/framework` imports `ThemeTokens` from there, never redefines it. Updating site-schema's `ThemeTokens` to this superset is part of this REQ.

Group

Keys

Notes

`palette` (9)

`bg, surface, surfaceSubtle, surfaceInverse, text, muted, primary, accent, border`

`text` replaces REQ-3's `fg`.

`typography.family` (2, nested)

`heading, body`

`typography.scale` (9)

`xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl`

Adds `5xl` to REQ-3's 8-step scale.

`typography.weights` (5)

`regular, medium, semibold, bold, black`

New in REQ-4.

`typography.lineHeights` (3)

`tight, normal, relaxed`

New in REQ-4.

`spacing` (10, geometric)

`0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

Replaces REQ-3's 7 named steps. Keys are quoted numeric strings.

`radius` (5)

`none, sm, md, lg, full`

Unchanged.

`shadow` (4)

`none, sm, md, lg`

Unchanged.

`container` (4)

`narrow, default, wide, bleed`

Replaces REQ-3's single `maxWidth`; `default` is the canonical body container.

`breakpoints` (4)

`sm, md, lg, xl`

Unchanged.

Total: **55 tokens.**

## Deliverables

### Site-schema update (prerequisite)

- `packages/site-schema/src/schema.ts` — update `PaletteTokens`, `TypographyTokens`, `SpacingTokens`, `ContainerTokens` to the superset above. All other types unchanged.

- `tests/_fixtures_REQ-3_site.ts` — update `makeThemeTokens()` to the new shape.

- REQ-3 UATs must continue to pass against the updated schema.

### Theme token system

- `packages/framework/src/tokens/contract.ts` — re-exports `ThemeTokens` from site-schema. Single source of truth for which slots exist and their primitive types.

- `packages/framework/src/tokens/defaults.ts` — sane default values for every slot (neutral palette, system fonts, standard scale). Used when a site omits a slot.

- `packages/framework/src/tokens/css.ts` — `generateThemeCss(tokens: ThemeTokens, options?: { dark?: PartialPalette }): string` produces a CSS file declaring custom properties (`--color-bg: …`, `--space-4: …`, etc.) on `:root`, with `@media (prefers-color-scheme: dark)` block when a dark palette is provided.

- CSS variable naming (deterministic):

- palette → `--color-<role>` (e.g., `--color-bg`, `--color-surface-subtle`, `--color-text`)

- family → `--font-family-<name>` (e.g., `--font-family-heading`)

- scale → `--font-size-<step>` (e.g., `--font-size-2xl`)

- weights → `--font-weight-<name>` (e.g., `--font-weight-bold`)

- lineHeights → `--line-height-<name>`

- spacing → `--space-<step>` (e.g., `--space-4`, `--space-12`)

- radius → `--radius-<name>`

- shadow → `--shadow-<name>`

- container → `--container-<name>`

- breakpoints → `--breakpoint-<name>`

### Module registry

- `packages/framework/src/modules/registry.ts` — exports a typed registry mapping `id → { meta, Component }`. The registry is how `tools/generate` (REQ-6) discovers modules.

- Helper `getModule(id, version)` returns the right component or throws with a clear catalog-miss error.

### Module contract enforcement

- `packages/framework/src/modules/types.ts` — TypeScript types ensuring every module file exports `moduleMeta` with the shape from DOC-7 §3.1 (id, version, variants, dials, contentSchema).

- A type-level test (compile-time) per module verifies the shape.

### Modules

#### `header` (1 variant)

- File: `packages/framework/src/modules/header/index.astro` + `meta.ts`

- Variant: `top-nav` (logo left, links right; responsive — collapses to hamburger below `breakpoint.md`)

- Dials: `spacingTop`, `spacingBottom`, `surface`

- Content: `logo` (AssetRef | text), `entries` (list of NavEntry)

- Scoped CSS using token references only

#### `hero` (2 variants)

- File: `packages/framework/src/modules/hero/index.astro` + `meta.ts`

- Variants: `bg-color`, `bg-image`

- Dials: `size` (sm/md/lg), `align` (left/center), `spacingTop`, `spacingBottom`, `surface`

- Content: `eyebrow` (optional string), `heading` (string), `subhead` (markdown), `cta` (optional `{label, href}`), `image` (AssetRef, required for `bg-image` variant only)

- Responsive type via clamp() between `size` steps

#### `footer` (1 variant)

- File: `packages/framework/src/modules/footer/index.astro` + `meta.ts`

- Variant: `minimal` (logo + tagline + copyright + optional small-link row)

- Dials: `surface`, `spacingTop`, `spacingBottom`

- Content: `logo` (optional AssetRef | text), `tagline` (optional string), `copyrightHolder` (string), `links` (optional list of NavEntry)

- Copyright year is rendered at build time using a build-time constant (no `new Date()` at render — keeps output deterministic across rebuilds)

### Build & packaging

- `packages/framework/package.json` — exports `tokens`, `modules`, `registry`; depends on `@1stcontact/site-schema`, `astro`

- Pure ESM, types emitted

- Astro components compiled by consuming app (no precompile here)

## Explicitly NOT in this ticket

- Content modules (`text-block`, `services-grid`, `contact-form`) — REQ-5.

- The static generator (`tools/generate`) — REQ-6.

- Any actual site definition or content — REQ-6.

- Theme-token edits via UI or AI — control-app concern, later REQ.

- Per-instance dial validation (`size` must be one of declared values) at render time — included as a small helper in REQ-5 alongside content modules where it's actually exercised.

- Catalog membership validation hook into site-schema — call site separately for now; can be unified later.

- A vetted Google Fonts shortlist — captured as a constant in REQ-6 alongside the marketing site content (it's a per-site choice, not a framework constant).

## Test approach (UATs)

Runner: vitest. Astro components tested via `astro/container` API (renders a component to an HTML string for assertion).

- `test_UAT_FC_REQ-4_generate_css_produces_root_custom_properties` — `generateThemeCss` output contains `:root { --color-bg: …; … }` covering every slot.

- `test_UAT_FC_REQ-4_generate_css_substitutes_defaults_for_missing_slots` — partial input fills missing slots from defaults.

- `test_UAT_FC_REQ-4_generate_css_emits_dark_mode_block_when_dark_palette_provided`

- `test_UAT_FC_REQ-4_registry_resolves_known_module` — `getModule('hero', 1)` returns hero v1.

- `test_UAT_FC_REQ-4_registry_throws_on_unknown_module` — `getModule('nope', 1)` throws a clear catalog-miss error.

- `test_UAT_FC_REQ-4_every_module_exports_module_meta` — type-level test: each module file's `moduleMeta` matches the contract.

- `test_UAT_FC_REQ-4_header_renders_logo_and_entries` — render `header`, assert anchor tags for each entry's target.

- `test_UAT_FC_REQ-4_header_collapses_below_md_breakpoint` — rendered HTML includes the responsive hamburger toggle markup.

- `test_UAT_FC_REQ-4_hero_renders_with_bg_color_variant` — variant `bg-color`, assert no `<img>` background element.

- `test_UAT_FC_REQ-4_hero_renders_with_bg_image_variant` — variant `bg-image`, assert background image element present with correct src/alt.

- `test_UAT_FC_REQ-4_hero_omits_cta_when_not_provided`

- `test_UAT_FC_REQ-4_footer_renders_copyright_with_year` — rendered text contains the configured year (constant) and copyright holder.

- `test_UAT_FC_REQ-4_footer_renders_optional_links`

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema).

- **Unblocks**:

- REQ-5 (content modules) — uses the same module contract and registry.

- REQ-6 (`tools/generate`) — consumes the module registry and CSS generator.


---

## REQ-5: Framework: content modules (text-block, services-grid, contact-form)

## Scope

Add the three content modules — `text-block`, `services-grid`, `contact-form` — to `packages/framework`, completing the 6-module Phase 0 catalog. Each module follows the same `moduleMeta` contract established in REQ-4; this REQ exercises markdown rendering, list-of-content fields, and a form module with progressive-enhancement client JS.

The `contact-form` module submits to a configurable `action` URL but produces no backend behavior in this REQ — the real handler (D1 INSERT + email notification) ships in REQ-7. For Phase 0 the form can be deployed and exercised against a stub endpoint added in REQ-6.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §3 (Module Contract) and §7.4 (Graceful degradation through `text-block`).

## Why free-coded

Catalog construction — same contract as REQ-4, applied to three more modules. One cohesive unit because the three modules together cover the content half of Phase 0's marketing-site needs (manifesto, services, lead capture).

## Deliverables

### `text-block` (2 variants)

- File: `packages/framework/src/modules/text-block/index.astro`
- Variants:
  - `prose` — `container.narrow` width, intended for articles, about-as-blog, terms, founder notes (per DOC-7 §7.4)
  - `landing` — `container.default` width, intended for marketing manifestos with more breathing room
- Dials: `size` (sm/md/lg — affects body type scale), `align` (left/center), `spacingTop`, `spacingBottom`, `surface`, `textAlign` (left/center)
- Content:
  - `heading` (optional string)
  - `body` (markdown, required)
- Markdown rendering via `@astrojs/markdown-remark` or `unified`/`remark`. Supports headings, lists, links, images, blockquotes, code blocks. Images use the framework's responsive image rendering (lazy, srcset).
- Container width is dictated by the variant, not by a dial — keeps variants meaningful.

### `services-grid` (2 variants)

- File: `packages/framework/src/modules/services-grid/index.astro`
- Variants: `three-col`, `two-col`. Below `breakpoint.md` both collapse to single column.
- Dials: `spacingTop`, `spacingBottom`, `surface`, `gap` (tight/normal/loose)
- Content:
  - `heading` (optional string)
  - `subhead` (optional markdown)
  - `items` (list of `{ icon?: AssetRef | string, title: string, body: markdown, cta?: { label, href } }`, length validated 2..6)
- Cards render with `radius.lg`, optional icon at top, title, body, optional CTA at bottom.

### `contact-form` (1 variant)

- File: `packages/framework/src/modules/contact-form/index.astro`
- Variant: `inline`
- Dials: `spacingTop`, `spacingBottom`, `surface`, `align` (left/center)
- Content:
  - `heading` (optional string)
  - `subhead` (optional markdown)
  - `action` (URL string, required — e.g., `/api/forms/contact`)
  - `fields` (list of `{ name, label, type: 'text'|'email'|'tel'|'textarea', required: boolean }`, length 1..8)
  - `submitLabel` (optional string, default `"Send"`)
  - `successMessage` (optional markdown)
- Server-rendered HTML form — works fully without JS (submits, page reloads with response).
- Progressive enhancement via small island JS:
  - Intercepts submit
  - `fetch` POSTs JSON to `action`
  - On 200, replaces form with `successMessage` (rendered markdown)
  - On non-200, surfaces the response error inline; does not navigate
- Honeypot field (`hp_<random>` style, hidden via CSS, server should reject when filled).
- A `data-turnstile-target` element renders where the Turnstile widget will mount; the actual widget is wired in REQ-7. Module degrades cleanly without it.

### Updates to the registry

- `packages/framework/src/modules/registry.ts` extended to include all six modules.
- `test_UAT_FC_REQ-4_every_module_exports_module_meta` is amended (or re-exercised) against the new modules — they all conform.

## Explicitly NOT in this ticket

- The form endpoint (`/api/forms/contact`) — added in REQ-6 as a stub returning `{success:true}`, and made real in REQ-7.
- D1 leads schema, INSERT, or any persistence — REQ-7.
- Resend / email-provider integration — REQ-7.
- Cloudflare Turnstile widget script loading and verification — REQ-7. (The module renders a mount point; the script + token submission are wired then.)
- Any actual marketing-site content for these modules — REQ-6.
- Additional variants beyond those listed (e.g., `text-block` with side image, `services-grid` with image cards). Captured in the catalog evolution log if requested later (DOC-7 §7).

## Test approach (UATs)

Runner: vitest, Astro container API for component tests, JSDOM for client-side form behavior.

### `text-block`

- `test_UAT_FC_REQ-5_text_block_prose_variant_uses_narrow_container`
- `test_UAT_FC_REQ-5_text_block_landing_variant_uses_default_container`
- `test_UAT_FC_REQ-5_text_block_renders_markdown_with_image_and_list`
- `test_UAT_FC_REQ-5_text_block_omits_heading_when_not_provided`

### `services-grid`

- `test_UAT_FC_REQ-5_services_grid_three_col_renders_three_cards`
- `test_UAT_FC_REQ-5_services_grid_two_col_renders_two_cards`
- `test_UAT_FC_REQ-5_services_grid_collapses_to_single_column_below_md` — assert the responsive class / media-query rule exists.
- `test_UAT_FC_REQ-5_services_grid_rejects_item_count_outside_2_to_6` — validation at content-schema level.

### `contact-form`

- `test_UAT_FC_REQ-5_contact_form_renders_configured_fields` — feed 3 fields, assert 3 `<input>`/`<textarea>` with right labels.
- `test_UAT_FC_REQ-5_contact_form_action_attribute_uses_configured_url`
- `test_UAT_FC_REQ-5_contact_form_includes_honeypot_hidden_field`
- `test_UAT_FC_REQ-5_contact_form_renders_turnstile_mount_point`
- `test_UAT_FC_REQ-5_contact_form_submits_without_js_via_html_post` — JSDOM, no client script, assert form action behaviour.
- `test_UAT_FC_REQ-5_contact_form_client_enhancement_intercepts_submit_and_posts_json` — JSDOM + island script, mock `fetch`, assert JSON payload.
- `test_UAT_FC_REQ-5_contact_form_client_renders_success_message_on_200`
- `test_UAT_FC_REQ-5_contact_form_client_renders_error_on_non_200`

### Registry

- `test_UAT_FC_REQ-5_registry_includes_all_six_phase0_modules` — `getModule` returns each of the 6.

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome + registry + tokens).
- **Unblocks**:
  - REQ-6 (`tools/generate` + site definition + wire `public-site`) — uses all 6 modules.
  - REQ-7 (lead-capture pipeline) — replaces the form's stub endpoint with a real handler; activates Turnstile.


---

## REQ-6: tools/generate + 1st Contact marketing site definition + wire public-site

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


---

## REQ-7: Lead-capture pipeline: D1 leads schema + Turnstile + Resend on public-site form handler

## Scope

Replace the stub `/api/forms/contact` endpoint on `apps/public-site` with the real lead-capture pipeline: D1 leads schema, Cloudflare Turnstile verification, Resend email notification. After this REQ the 1st Contact contact form captures real leads end-to-end on `1stcontact.io`.

This is also the first D1 work in the codebase — establishes the migration pattern under `db/migrations/` and the D1 binding pattern in a Worker.

Design discussion: see [[DOC-5]] (Platform Architecture) on lead/contact data + magic links; [[DOC-7]] (Framework Architecture) §9.3 on the public-site Worker as the home for public-facing endpoints.

## Why free-coded

Single cohesive feature: data plus side-effects plus configuration. The lead schema is small and well-specified; the form-handler logic is procedural; the Resend integration is direct. No algorithmic design — execution.

## Deliverables

### D1 schema

`db/migrations/0001_create_leads.sql`:

```sql
CREATE TABLE leads (
  id              TEXT PRIMARY KEY,            -- ulid or uuid
  site_id         TEXT NOT NULL,                -- '1stcontact' for now; per-site later
  form_id         TEXT NOT NULL,                -- 'contact' for now; multiple forms per site later
  created_at      INTEGER NOT NULL,             -- unix ms
  name            TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  extra_fields    TEXT,                          -- JSON blob for non-canonical fields
  page_path       TEXT,                          -- where the form was submitted from
  user_agent      TEXT,
  ip_country      TEXT,                          -- from CF-IPCountry
  turnstile_pass  INTEGER NOT NULL DEFAULT 0,    -- 0/1
  status          TEXT NOT NULL DEFAULT 'new',   -- new | contacted | quote_needed | quote_sent | follow_up | booked | lost | archived
  notes           TEXT
);

CREATE INDEX leads_site_created ON leads (site_id, created_at DESC);
CREATE INDEX leads_status ON leads (site_id, status);
```

Status enum matches the CRM Lite lifecycle in [[DOC-4]] (§3 CRM Lite) and [[DOC-5]] (CRM Lite Architecture). The schema deliberately includes columns the CRM Lite UI will need so we're not migrating again immediately.

Migration applied via `wrangler d1 migrations apply` against a D1 database named `1stcontact-prod` (created out-of-band; ID recorded in `wrangler.toml`).

### `apps/public-site` updates

- `apps/public-site/wrangler.toml`:
  - Add `[[d1_databases]]` binding `LEADS_DB` to the production database.
  - Add `[vars]` for non-secret config: `TURNSTILE_SITE_KEY`, `RESEND_NOTIFY_TO`, `RESEND_NOTIFY_FROM`, `SITE_ID="1stcontact"`.
  - Secrets (set via `wrangler secret put`): `TURNSTILE_SECRET`, `RESEND_API_KEY`.
- `apps/public-site/src/forms.ts` — real handler:
  1. Parse + content-type validate JSON.
  2. Honeypot check (drops silently).
  3. Field validation: `email` required + RFC-shaped; required custom fields per form config.
  4. Turnstile token verify via `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET`. On failure: 400, no DB write.
  5. Generate ULID. Read `CF-IPCountry` header for `ip_country`.
  6. INSERT into `leads`.
  7. Resend POST to `https://api.resend.com/emails`: from `RESEND_NOTIFY_FROM`, to `RESEND_NOTIFY_TO`, subject "New lead: {name} <{email}>", body containing lead fields + lead UUID. Failure is logged but does NOT fail the request — the lead is already persisted.
  8. Return `200 {success: true, message: "Thanks — we'll be in touch.", lead_id}`.

Errors return JSON `{success: false, error: <code>, message: <string>}`. Codes: `INVALID_JSON`, `INVALID_CONTENT_TYPE`, `MISSING_FIELD`, `INVALID_EMAIL`, `TURNSTILE_FAILED`, `INTERNAL`.

### Turnstile widget loading

- `packages/framework/src/modules/contact-form/index.astro` — load the Turnstile script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) when the module is present on a page; the existing `data-turnstile-target` element from REQ-5 becomes the widget mount; widget configured with the site's `TURNSTILE_SITE_KEY` (exposed via build-time inlining or a `<meta>` tag — decision in the implementation).
- Client island intercepts submit, retrieves the Turnstile token, includes it in the JSON POST as `turnstile_token`.

### Email notification template

A minimal HTML body (no marketing chrome) — branded with 1st Contact wordmark, lead fields tabulated, "Open in dashboard" link placeholder (real link wired when the control-app's lead view exists in a later REQ).

### Out-of-band operator tasks (documented in ticket)

- `wrangler d1 create 1stcontact-prod` and record the database id in `wrangler.toml`.
- `wrangler d1 migrations apply 1stcontact-prod --remote` to apply `0001_create_leads.sql`.
- Set up Turnstile site in Cloudflare dashboard for `1stcontact.io`; capture site key + secret.
- Set up Resend account, verify sending domain, capture API key.
- `wrangler secret put TURNSTILE_SECRET`
- `wrangler secret put RESEND_API_KEY`

## Explicitly NOT in this ticket

- CRM Lite UI to view/manage leads — control-app concern, later REQ. Status changes in this REQ default to `new`; no transitions.
- Lead deduplication (same email submitting twice). Future.
- Auto-reply email to the lead. Future.
- Multi-site lead routing — `site_id` hardcoded to `1stcontact` in this REQ; per-site routing comes with customer site support.
- Magic-link "manage this inquiry" follow-up per DOC-5 — future.
- Webhook / Slack notification. Future.
- Lead export / deletion APIs. Future (privacy work in DOC-5).

## Test approach (UATs)

Runner: vitest with `wrangler.unstable_dev`. D1 binding uses the local sqlite emulator. Resend and Turnstile calls mocked via fetch stubs.

- `test_UAT_FC_REQ-7_migration_creates_leads_table_with_expected_columns` — apply migration to a fresh local D1, query `pragma table_info(leads)`, assert column set + types + NOT NULLs + indexes.
- `test_UAT_FC_REQ-7_post_inserts_lead_with_all_canonical_fields` — happy-path POST with valid Turnstile, mocked Resend, asserts row in D1 with expected values.
- `test_UAT_FC_REQ-7_post_returns_lead_id_in_response`
- `test_UAT_FC_REQ-7_post_writes_ip_country_from_cf_header`
- `test_UAT_FC_REQ-7_post_persists_lead_when_resend_call_fails` — Resend mock returns 500, assert 200 to client, assert row in D1, assert logged error.
- `test_UAT_FC_REQ-7_post_rejects_invalid_content_type` — 400, INVALID_CONTENT_TYPE.
- `test_UAT_FC_REQ-7_post_rejects_malformed_json` — 400, INVALID_JSON.
- `test_UAT_FC_REQ-7_post_rejects_missing_email` — 400, MISSING_FIELD, no DB write.
- `test_UAT_FC_REQ-7_post_rejects_invalid_email` — 400, INVALID_EMAIL.
- `test_UAT_FC_REQ-7_post_rejects_failed_turnstile` — Turnstile mock returns `{success:false}`, 400 TURNSTILE_FAILED, no DB write, no Resend call.
- `test_UAT_FC_REQ-7_post_drops_honeypot_submission_silently` — honeypot filled: returns 200 success body but no DB row and no Resend call.
- `test_UAT_FC_REQ-7_post_handles_non_canonical_fields_via_extra_fields_json` — submission includes `business_name` (not a column), stored in `extra_fields` JSON.
- `test_UAT_FC_REQ-7_contact_form_island_attaches_turnstile_token_on_submit` — JSDOM, mock Turnstile global, assert posted JSON includes `turnstile_token`.

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome), REQ-5 (contact-form module with Turnstile mount + honeypot), REQ-6 (`public-site` with stub endpoint to replace).
- **Unblocks**:
  - CRM Lite UI on the control-app (later REQ) — `leads` table is now populated.
  - Customer-site form handling — needs per-site routing on top of the same handler shape.
- **Operator prerequisites** (before deploy):
  - D1 database created and id recorded.
  - Migration applied.
  - Turnstile + Resend accounts set up; secrets pushed.

-


---

## REQ-8: Builder v1: chat-driven SPA + AI tool orchestration + in-browser preview

## Scope

Build the Phase 0 chat-driven site builder per [[DOC-8]]: a two-panel SPA with collapsible chat on the left, live in-browser preview on the right, AI tool orchestration through `apps/control-app` Worker, and four-layer validator wiring against `@1stcontact/site-schema`.

After this REQ: navigating to `app.1stcontact.io/builder?site=1stcontact` loads the 1st Contact site definition, lets the operator drive structured edits via chat (e.g. "make the hero darker", "add a services grid below the hero", "swap the heading"), and shows the resulting preview update live in the same screen. State persists to localStorage only; D1 save is a later REQ.

Design discussion: see [[DOC-8]] (Builder UI Architecture Principles), particularly §2 (Layout), §3 (Live Preview Rendering), §4 (Chat → AI → Diff → State → Render Pipeline), §5 (AI Tool Surface), §6 (Validation Contract). Also [[DOC-7]] §2.4 (renderer invocable in-browser) and §6.5 (mechanical validation contract).

## Why free-coded

First slice of an inherently interactive system. Architecture is locked in DOC-8; what remains is wiring existing pieces (`@1stcontact/site-schema` validator, `packages/framework` renderer, Anthropic API) into the two-panel UX. No new algorithmic design.

## Dependencies

- [[REQ-3]] — `@1stcontact/site-schema` validator must be available.
- [[REQ-4]] — framework theme tokens, CSS generator, registry, chrome modules (header/hero/footer).
- [[REQ-5]] — content modules (text-block, services-grid, contact-form) for a meaningful preview.

This REQ should land after REQ-3, REQ-4, REQ-5. It does not depend on REQ-6 (generator) or REQ-7 (lead pipeline).

## Deliverables

### `packages/builder-ui`

React components for the builder shell:

- **`<BuilderLayout>`** — two-panel composition. Chat panel left, preview right, draggable splitter between, chat collapses to a 32px vertical bar with a restore chevron (mirrors XGD `#chat-list-panel` pattern). Persisted widths + collapsed state in `localStorage` (key `1stcontact_builder_panels_v1`).
- **`<ChatPanel>`** — message list (user + assistant turns), text input, send. Shows AI narrative reply alongside structured tool-call summaries. No raw JSON editor (permanently out of scope per [[DOC-8]] §9).
- **`<PreviewPanel>`** — same-origin `<iframe>` controlled via `iframe.contentDocument`. Viewport switcher with three presets per [[DOC-8]] §3.4: mobile (375px), tablet (768px), desktop (100% of pane).
- **`useSiteDefinitionStore`** — Zustand store holding the canonical site-definition JSON; applies validated tool-call diffs; emits change events the preview subscribes to. In-memory diff log for per-session undo/redo.
- **`renderSiteIntoIframe(iframe, siteDefinition)`** — imports `packages/framework` as ESM and writes the rendered DOM into the iframe document. Reacts to store changes by re-rendering only the affected modules (granularity = page-level for v1; per-module diff rendering is a later optimization).

### `apps/control-app` SPA shell

- New Astro route `/builder` that mounts `<BuilderLayout>` as a React island.
- Loads the starting site definition from `apps/control-app/public/starter-sites/1stcontact.json` (bundled copy of `sites/1stcontact/site.json` at build time). The query param `?site=1stcontact` selects it; v1 supports only this one site.
- No auth in this REQ — `/builder` is open. Auth gating is a later REQ alongside D1 save.

### `apps/control-app` Worker — `/api/chat` endpoint

- `POST /api/chat` accepts `{ history: ChatMessage[], siteDefinition, frameworkCatalog }` and returns a streaming response.
- Calls Anthropic API (Claude model id from env, default `claude-sonnet-4-6`). API key from `CLAUDE_API_KEY` secret.
- Tool definitions for the v1 AI tool subset per [[DOC-8]] §5.1:
  - `set_module_content(instance_id, field, value)`
  - `set_module_dial(instance_id, dial, value)`
  - `set_module_variant(instance_id, variant)`
  - `add_module(page_id, type, version, after_instance_id?)`
  - `remove_module(instance_id)`
  - `reorder_modules(page_id, instance_ids)`
  - `set_theme_token(name, value)`
  - `set_site_config(field, value)`
- System prompt includes the framework catalog (module types + variants + dials + content schemas + token contract) as part of the tool descriptions, so AI emits valid values first-try per [[DOC-8]] §5.3.
- Streams tool calls back to the client as they arrive; client applies each through the validator.

### Validator wiring (four layers per [[DOC-7]] §6.5 / [[DOC-8]] §6)

- **Layer 1 (AI tool call)**: every tool call returned by `/api/chat` validated client-side via `validate(siteDefinition, frameworkCatalog)` *before* applying to state. On failure, structured error fed back to the model in the same turn as a tool result; client UI shows a one-line note ("AI tried X but the validator rejected it — it will retry").
- **Layer 2 (builder state)**: `useSiteDefinitionStore` rejects any direct setState that doesn't pass validation. Defensive — should never fire if Layer 1 is working.
- **Layer 3 (save to D1)** — out of scope for this REQ.
- **Layer 4 (build / publish)** — already lives in `tools/generate` per REQ-6.

### UATs (`test_UAT_FC_<REQ-ID>_*`)

- `panel_collapse_restore` — chat panel collapses to 32px bar via chevron, restores to remembered width on click. State survives reload.
- `splitter_drag` — splitter drag resizes panels; clamped to min widths; final width persists.
- `viewport_switch` — clicking mobile/tablet/desktop preset changes iframe width to 375/768/100% respectively.
- `tool_call_applies_to_preview` — a stubbed `/api/chat` response containing a `set_theme_token` tool call updates the site-definition store and re-renders the preview iframe with the new token value.
- `invalid_tool_call_rejected` — a stubbed tool call with an invalid dial value (`shape: 'cirle'`) is rejected by the validator; site-definition state unchanged; structured error visible in the chat log.
- `state_persisted_to_localstorage` — after a sequence of edits, reload preserves the working site definition.
- `chat_endpoint_invokes_anthropic` — `/api/chat` POSTs to the Anthropic SDK using the bound API key; assert via SDK mock at the boundary (no internal mocks per `EXTREME-GENERATIVE-DEVELOPMENT.md`).

## Out of scope

- D1 save / load of site definitions — later REQ alongside schema migration.
- Auth flow / magic links — later REQ.
- Portal / dashboard / CRM surfaces — separate REQs.
- Full DOC-8 §5.1 tool surface — `set_nav_pattern`, `set_nav_entries`, `attach_asset`, `add_page`, `remove_page`, `reorder_pages` are deferred to a v1.5 REQ once the core loop is proven.
- Streaming the AI's narrative text token-by-token in the chat panel (renders only on turn complete in v1).
- Diff visualization, what-changed sidebar, drag-to-reorder in preview, click-to-edit — all permanently or v2+ out of scope per DOC-8 §9.
- Mobile-friendly builder UI — desktop-first per DOC-8 §8.

## Risks / open items

- **Anthropic streaming + tool calls**: validating tool calls mid-stream is fiddly. Acceptable v1 behaviour is to wait for each tool call to fully arrive before validating + applying — no partial-arg validation. Document if it ends up materially worse than expected.
- **Framework module import in browser**: depends on REQ-4 building `packages/framework` as proper ESM. If anything Node-only sneaks into the framework's runtime path, this REQ will surface it.
- **localStorage size limit**: a complex site definition with embedded base64-ish assets could blow the ~5MB quota. v1 puts assets behind refs (per DOC-7 schema), so the definition itself stays small. Add a guard that logs if the serialized definition exceeds 1MB.


---

## Implementation notes (added during free-coding cycle)

### Vanilla-DOM, not React

The ticket scope named "React components for the builder shell" because [[DOC-8]] §9.2 specifies "React islands". The free-coded slice implemented the components as vanilla DOM (a small `BuilderStore` + DOM factory functions) instead. Reason: React's runtime overhead and bundle cost is unjustified for a UI that's almost entirely DOM-write-once (mount, then react to store events). The components are framework-agnostic and mount cleanly from an Astro island, a `<script type="module">`, or any future React shell. UATs validate behaviour, not framework choice. Promote-time conversion to React (when surface complexity warrants it) stays a single mechanical refactor.

### `shape: 'cirle'` UAT realised as `size: 'huge'`

[[DOC-8]] §5.3 lists `shape: 'cirle'` as the canonical invalid-dial example. The bundled hero / text-block / etc. modules from [[REQ-4]] and [[REQ-5]] don't declare a `shape` dial — so the `invalid_tool_call_rejected` UAT asserts on `size: 'huge'` (not in `[sm, md, lg]`) instead, which exercises the same validator code path. Same evidence, same DOC-8 §6 invariant pinned.

### SPA shell scope

The /builder route is served from Workers Static Assets (wrangler `[assets]` binding pointing at `apps/control-app/public/`). `apps/control-app/scripts/build-builder-bundle.mjs` runs esbuild to bundle `packages/builder-ui/src/spa.ts` → `public/_assets/builder.js` (~176 KB, source-mapped). Hooked into `apps/control-app`'s `build` / `deploy` / `dryrun` scripts. Bundle output and the copied `starter-sites/1stcontact.json` are gitignored — both rebuild deterministically.

### Browser-safe framework subpath

Added `@1stcontact/framework/meta` — a leaner re-export of just the module metas (no Astro components, no Node-fs styles), consumed by `builder-ui/catalog.ts`. Without it the SPA bundle pulls in the Astro renderer and `node:fs/promises`. The original `@1stcontact/framework/modules` export is unchanged.

### Tests

Eight test files, 13 tests:
- `panel_collapse_restore` — chat panel collapses to 32px restore bar; state persists across reload.
- `splitter_drag` — splitter drag resizes, clamps to min/max, persists.
- `viewport_switch` — mobile/tablet/desktop presets resize the iframe to 375/768/100%.
- `tool_call_applies_to_preview` — stubbed `/api/chat` `set_theme_token` updates store and preview iframe CSS in lockstep.
- `invalid_tool_call_rejected` — out-of-enum dial rejected, structured error surfaced, state unchanged.
- `state_persisted_to_localstorage` — site definition + two chat-turn mutations survive store re-instantiation; size-threshold warning fires but still persists.
- `chat_endpoint_invokes_anthropic` — `/api/chat` calls Anthropic Messages API at the configured URL with the bound API key, tool definitions, system prompt; extracts `text` + `tool_use` blocks; 500 on missing key; 502 on upstream failure.
- `builder_route_serves_spa_shell` — Worker rewrites `/builder` and `/builder/` to `/builder.html` via the ASSETS binding; other static paths pass through.

All 125 tests in the workspace pass after this slice.