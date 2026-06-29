---
uid: acceptance_criterion-1a7714f2
id: AC-727
type: acceptance_criterion
title: web-fetch-safety package is consumable without declaring @cloudflare/workers-types
created_by: xgd
created_at: '2026-06-29T21:36:36.965520+00:00'
updated_at: '2026-06-29T21:36:36.965520+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A downstream package that imports `@1stcontact/web-fetch-safety` compiles under `pnpm build` without having to declare `@cloudflare/workers-types` in its own tsconfig `types[]` array. The library does not leak a `KVNamespace` ambient-global requirement onto its consumers: building such a consumer produces no `TS2304: Cannot find name 'KVNamespace'` errors.

## Verification

Confirm `packages/extractor/tsconfig.json` does NOT list `@cloudflare/workers-types` in `compilerOptions.types` (the consumer scenario), then run `pnpm --filter @1stcontact/extractor build` and assert it exits successfully with no `TS2304: Cannot find name 'KVNamespace'` errors emitted from the imported `web-fetch-safety` sources.
