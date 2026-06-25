---
uid: story-aecb7377
id: STORY-39
type: story
title: 'site-schema: typed site contract + runtime validation'
created_by: xgd
created_at: '2026-06-25T00:38:20.870460+00:00'
updated_at: '2026-06-25T00:45:13.279699+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-b7eebd2b
  story_kind: feature
  story_points: 2
---

## Story

**As a** consumer of the platform's site-definition contract
(framework modules, the static site generator, the public-site
Worker, the builder SPA),
**I want** a single typed schema package that defines what a valid
site definition looks like and a runtime validator that turns
unknown input into either a typed `Site` value or a list of
errors with JSON-pointer paths,
**so that** every later component can rely on the same shape, fail
fast on malformed input, and never has to reinvent or duplicate
the contract.

## Description

This story documents the `@1stcontact/site-schema` package — the
foundational data contract that every other component imports.

In scope:

- TypeScript types derived from Zod schemas (`z.infer`) for the full
  site hierarchy: `Site`, `SiteConfig`, `ThemeTokens` (with its
  locked superset of palette / typography / spacing / radius /
  shadow / container / breakpoints), `NavConfig`, `NavPattern`,
  `NavEntry` (discriminated union by `kind`: `page` / `anchor` /
  `url`), `Page`, `ModuleInstance`, `Dials`, `ModuleContent`,
  `ContentValue`, `AssetRef`, and `SeoMeta`.
- The theme token slot superset locked by the operator: a 9-role
  palette (`bg`, `surface`, `surfaceSubtle`, `surfaceInverse`,
  `text`, `muted`, `primary`, `accent`, `border`); a 9-step type
  scale (`xs..5xl`) plus 5-step weights and 3-step line-heights and
  the heading/body family pair; a 10-step geometric spacing scale
  (`0, 1, 2, 3, 4, 6, 8, 12, 16, 24`); a 5-step radius scale; a
  4-step shadow scale; a 4-slot container set (`narrow`, `default`,
  `wide`, `bleed`); and a 4-step breakpoint set.
- A `ContentValue` recursive shape admitting `string | number |
  boolean | null | AssetRef | ContentValue[] | { [key: string]:
  ContentValue }` so module content can model nav-entry lists,
  CTA objects, services-grid items, contact-form field arrays, and
  similar object-shaped fields without escape hatches.
- `validateSite(input: unknown): Result<Site, ValidationError[]>` —
  a single entry point returning a discriminated union. On success
  the value narrows to `Site` at compile time; on failure each
  error carries a JSON-pointer path (e.g. `/theme/palette/primary`)
  and a human-readable message.
- Structural validation rules enforced by the schema:
  - required shape and primitive types throughout;
  - hex color regex (`#rgb` / `#rrggbb` / `#rrggbbaa`) on every
    palette slot;
  - theme-token slot completeness (every slot in the superset must
    be present);
  - module IDs unique within a page;
  - page slugs unique within a site;
  - the nav pattern is one of the five named values
    (`in-page-anchors`, `top-tabs`, `top-tabs-dropdown`,
    `hamburger`, `footer-only`).

Out of scope (deliberate boundary):

- Catalog membership validation. The schema does NOT check whether
  a module's `type`, a module's `variant`, or a dial value is real
  — those are framework-time concerns at render. A site whose
  module has `type: 'totally-fake-module'` still passes
  `validateSite()`; the framework rejects it later.
- Theme token default *values*. The schema only constrains slot
  presence and primitive types; defaults live in the framework.
- Site-file format (JSON / YAML / TOML). The validator accepts an
  already-parsed `unknown`; the generator chooses the format.

## Technical Context

- Architecture policy (DOC-5): structured site data lives in the
  product database (D1) and feeds the static generator. This
  schema is the in-memory contract that intermediates between
  authoring (builder SPA, D1) and rendering (framework, static
  generator). It does not own storage.
- DOC-7 design discussion frames the composition model (§2),
  module contract (§3), theme token system (§4), and navigation
  patterns (§5). The schema implements those data shapes; the
  framework implements catalog enforcement (§6.5 layer 2+).
- The contract evolves once across the bundle: REQ-3 introduced
  the initial schema, REQ-4 widened `ThemeTokens` to the locked
  superset (palette → 9 roles, scale → 9 steps + weights +
  lineHeights, spacing → 10 geometric steps, container → 4 slots),
  and REQ-6 widened `ContentValue` to admit plain objects. The
  documented shape is the post-bundle steady state — mid-bundle
  intermediate shapes are intentionally not captured.
- Code under `packages/site-schema/src/` (`schema.ts`,
  `validate.ts`, `index.ts`) implements the contract as a single
  Zod source-of-truth with TypeScript types derived via
  `z.infer`. The validator wraps Zod's `safeParse` and projects
  `ZodIssue.path` arrays into JSON pointers using the standard
  `~0`/`~1` escape rules.
- Consumers: `@1stcontact/framework`, `tools/generate`,
  `packages/builder-ui`, `apps/public-site`, `apps/control-app`.
  All import types from this package; none redefine them.

## Dependencies

- STORY-38 (capability-8bfbe75a — Platform Deployment
  Infrastructure): the monorepo workspace, the
  `@1stcontact/site-schema` package wiring, and the toolchain
  that lets this package compile and be consumed.

## Story Points

2