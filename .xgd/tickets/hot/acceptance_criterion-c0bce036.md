---
uid: acceptance_criterion-c0bce036
id: AC-819
type: acceptance_criterion
title: Workspace packages use the @gendev npm scope; product slug unchanged
created_by: xgd
created_at: '2026-06-30T04:55:55.032392+00:00'
updated_at: '2026-06-30T04:55:55.032392+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

Every workspace npm package is published under the `@gendev/*` scope
(renamed from the legacy `@1stcontact/*` scope), and no `@1stcontact/*`
package name, dependency key, or `import` specifier survives anywhere in
`apps/`, `packages/`, or `tools/` source:

- Each workspace `package.json` `name` field is `@gendev/<name>`.
- All cross-package dependency keys and `import` statements reference
  `@gendev/*`.
- The root `package.json` `pnpm --filter` scripts target `@gendev/*`.

The *product* identity is unchanged by the rename: the root monorepo
package `name` is still `1stcontact`, both Worker names in
`wrangler.toml` are still `1stcontact-*`, and the site-definition
directory is still `sites/1stcontact/`. (The only surviving literal
`@1stcontact` text in source is the product contact email
`hello@1stcontact.io` in a starter-site fixture — an email address, not
an npm scope.)

## Verification

Grep `apps/`, `packages/`, and `tools/` source (excluding build
artifacts such as `dist/`, `_assets/`, and `*.js.map`) for `@1stcontact/`
and assert no package-scope match remains. Read each workspace
`package.json` and assert its `name` is `@gendev/<name>`. Assert the root
package `name` is `1stcontact` and the Worker names remain `1stcontact-*`.
