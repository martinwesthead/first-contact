---
uid: capability-3630a42c
id: CAP-34
type: capability
title: Framework Module Catalog
created_by: xgd
created_at: '2026-06-25T00:55:42.900949+00:00'
updated_at: '2026-06-25T00:55:42.900949+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Framework Module Catalog
---

The framework module catalog is the typed registry of renderable site modules. Each module conforms to a common contract (id, version, variants, dials, contentSchema) and ships an Astro component plus scoped CSS that references theme tokens only.

Consumers (the static generator and the in-browser builder preview) look up modules by id+version through `getModule()`. The registry surfaces a clear catalog-miss error on unknown lookups. A browser-safe subpath exports just the module metas so the builder SPA can bundle the catalog without pulling in server-only dependencies.

This capability covers the contract, the registry, and the modules that conform to it. Two stories live under it: chrome modules (header, hero, footer — structural skeleton of every site) and content modules (text-block, services-grid, contact-form — body content).
