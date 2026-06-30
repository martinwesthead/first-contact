---
uid: acceptance_criterion-59babe5e
id: AC-820
type: acceptance_criterion
title: Four empty @gendev productization package skeletons exist; ui-kit removed
created_by: xgd
created_at: '2026-06-30T04:56:11.060864+00:00'
updated_at: '2026-06-30T04:56:11.060864+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

Four productization package skeletons exist under `packages/`, seeded
ahead of their implementation:

- `packages/api-contracts`, `packages/auth`, `packages/billing`, and
  `packages/portal-ui`.
- Each contains a `package.json` whose `name` is `@gendev/<name>`, a
  `tsconfig.json`, a `README.md` describing the package's role and
  linking its design docs, and a `src/index.ts` that exports nothing
  real (an empty placeholder, no implementation).

The former `packages/ui-kit` stub no longer exists.

## Verification

For each of `api-contracts`, `auth`, `billing`, `portal-ui`, assert the
directory exists and contains `package.json` (with `name` ==
`@gendev/<name>`), `tsconfig.json`, `README.md`, and `src/index.ts`, and
that `src/index.ts` exports no real symbols. Assert `packages/ui-kit`
does not exist.
