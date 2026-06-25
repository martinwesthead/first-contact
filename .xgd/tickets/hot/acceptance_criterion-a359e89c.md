---
uid: acceptance_criterion-a359e89c
id: AC-424
type: acceptance_criterion
title: Browser-safe meta subpath exports every module meta without depending on server-only
  modules
created_by: xgd
created_at: '2026-06-25T00:57:42.326284+00:00'
updated_at: '2026-06-25T00:57:42.326284+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

The framework exposes a browser-safe subpath (`@1stcontact/framework/meta`) that re-exports every registered module's meta and the module-contract types. Importing the subpath does NOT transitively pull in Astro component renderers or Node-only modules, so a browser bundler can include the catalog metas without server-only dependencies.

## Verification

Import every chrome module meta (header, hero, footer) from the `@1stcontact/framework/meta` subpath and assert each meta's `id` and `version` match the values exposed by the same module through the registry. Bundle the subpath through a browser-targeted bundler (or otherwise verify the dependency graph reachable from the subpath) and assert the dependency graph contains no Astro server runtime imports and no Node-only module imports (`fs`, `path`, etc.).
