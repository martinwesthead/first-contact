---
uid: capability-b7eebd2b
id: CAP-32
type: capability
title: Site Definition Schema
created_by: xgd
created_at: '2026-06-25T00:37:42.497383+00:00'
updated_at: '2026-06-25T00:37:42.497383+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: site_definition_schema
---

# Site Definition Schema

The data contract every platform component shares when reading or
writing site definitions. Site definitions describe everything needed
to build a customer marketing site — business config, theme tokens,
navigation, pages, and the module instances composing each page.

This capability owns:
- The TypeScript types and runtime schemas for `Site`, `SiteConfig`,
  `ThemeTokens`, `NavConfig`/`NavPattern`/`NavEntry`, `Page`,
  `ModuleInstance`, `Dials`, `ModuleContent`, `ContentValue`,
  `AssetRef`, and `SeoMeta`.
- The `validateSite()` entry point, returning a typed success value
  or a list of validation errors carrying JSON-pointer paths.
- Structural validation rules (required shape, primitive types, hex
  color regex, theme token slot completeness, module-id uniqueness
  within a page, page-slug uniqueness within a site).
- The boundary that catalog membership (whether a module type /
  variant / dial value is real) is NOT a schema concern — that
  responsibility belongs to the framework at render time.

Subsequent capabilities (framework module catalog, CSS generator,
static site generator, public-site worker, builder SPA) import the
types and the validator from this contract; they are forbidden from
redefining the shapes.
