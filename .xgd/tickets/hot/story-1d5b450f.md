---
uid: story-1d5b450f
id: STORY-41
type: story
title: 'Framework module catalog: chrome modules (header, hero, footer) under a typed
  registry'
created_by: xgd
created_at: '2026-06-25T00:56:14.997576+00:00'
updated_at: '2026-06-25T00:56:14.997576+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-3630a42c
  story_kind: feature
  story_points: 3
---

## Story

**As a** site author or generator/preview consumer,
**I want** a typed registry of chrome modules (header, hero, footer) that each conform to a common contract and can be looked up by id and version,
**so that** every site can render a complete navigational and visual skeleton from structured data, with predictable variants, dials, and content shapes the framework understands.

## Description

This story establishes the framework module system and the three chrome modules that form the structural skeleton of every customer site (top navigation, hero section, footer).

In scope:

- A common module contract — every module exports a `moduleMeta` declaring its `id`, `version`, allowed `variants`, allowed `dials` (each with an enumeration of accepted values), and a `contentSchema` describing the shape of its content (primitive types, asset references, navigation entries, enums, lists of N..M, nested objects).
- A typed registry that resolves a module by id and version to its component plus meta, surfaces a clear catalog-miss error on unknown lookups (or on a known id with an unknown version), and exposes the full list of registered modules.
- Three chrome modules conforming to the contract:
  - **header** (variant `top-nav`): logo (asset ref or text) on the left, navigation entries on the right; collapses to a hamburger control below the `md` breakpoint and expands again at and above `md`.
  - **hero** (variants `bg-color`, `bg-image`): optional eyebrow, heading, optional markdown subhead, optional `{label, href}` CTA; the `bg-image` variant renders an actual background image element, the `bg-color` variant renders no image element. Dials: `size`, `align`, `spacingTop`, `spacingBottom`, `surface`.
  - **footer** (variant `minimal`): optional logo, optional tagline, required copyright (holder + year), optional small-link row. The copyright year is supplied as a build-time constant so output is deterministic across rebuilds — no `new Date()` at render.
- Every module ships scoped CSS that references CSS custom properties from the framework's theme tokens only — no inline styles, no hard-coded colors or spacing values.
- A browser-safe `@1stcontact/framework/meta` subpath that exports only the module metas (no Astro components, no Node-only modules) so the in-browser builder can bundle the catalog without pulling in server-only dependencies.

Out of scope:

- The three content modules (`text-block`, `services-grid`, `contact-form`) — covered by item 5 under the same capability.
- The static site generator that consumes this registry — covered by item 6.
- Per-instance dial-value validation (the type system enforces dial shape; runtime value validation lives with content modules in item 5).
- Catalog membership validation hooked back into site-schema (intentionally left out per REQ-4 — site-schema validates shape; the framework validates catalog membership at render time).

## Technical Context

- Depends on:
  - **STORY-39** (Site Definition Schema) for `AssetRef`, `NavEntry`, `NavTarget` types used by module props and for the `ThemeTokens` superset that scoped CSS references.
  - **STORY-40** (Framework Theme Tokens & CSS Generator) for the CSS custom property names (`--color-*`, `--space-*`, `--font-family-*`, `--font-size-*`, `--font-weight-*`, `--line-height-*`, `--container-*`, `--radius-*`, etc.) that every module's scoped CSS resolves against at runtime.
- Architecture: the registry is the consumer-facing contract — both the static generator (item 6) and the in-browser builder (item 9) discover modules through it. The browser-safe `/meta` subpath exists specifically because Astro components and Node-only style loaders cannot be bundled into the builder SPA.
- Module versioning: every module declares a `version` integer. Lookups specify both id and version, so future incompatible changes ship as a new version rather than mutating the existing one. The catalog-miss error distinguishes "unknown id" from "known id, unknown version" in its message.
- Year-as-constant in footer: passing `copyrightYear` as a prop (rather than computing it at render time) makes the generator's output byte-stable across rebuilds — a property required by the static-asset deploy model.
- Implementation note (code observation, not a story constraint): the registry resolution mechanism is a plain in-memory map keyed by id then version; future evolution might wrap this for hot reload in the builder, but the contract surface (`getModule(id, version)`, `listRegisteredModules()`, catalog-miss error) is what callers depend on.

## Dependencies

- Plan items 2 and 3 (Site Schema, Framework Tokens & CSS Generator).

## Story Points

3
