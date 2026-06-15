---
uid: request-a946bff3
id: REQ-4
type: request
title: 'Framework: theme tokens, CSS generator, module registry, chrome modules (header/hero/footer)'
created_by: xgd
created_at: '2026-06-12T23:06:33.531407+00:00'
updated_at: '2026-06-15T22:41:00.480678+00:00'
completed_at: null
last_field_updated: status
status: bundled
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 5
  commits:
  - d4f8e4d5b09dec5fd803a52c2aaad69875370b68
  bundled_in: bundle-94e1d1b6
---

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