---
uid: acceptance_criterion-6d995e49
id: AC-390
type: acceptance_criterion
title: Toolchain is pinned to Node 20+ and pnpm 9+ with a frozen lockfile
created_by: xgd
created_at: '2026-06-25T00:28:54.222710+00:00'
updated_at: '2026-06-25T00:28:54.222710+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The repository pins its build toolchain so CI and deploy produce
reproducible bundles:

- The root `package.json` declares a Node engine requirement of
  `>=20` (or a more specific 20.x constraint).
- The root `package.json` declares a pnpm `packageManager` field
  whose version is `9.x`, allowing corepack to provision the exact
  pnpm version automatically.
- A `pnpm-lock.yaml` file is committed at the repository root.
- Both the CI and deploy workflows install dependencies with the
  `--frozen-lockfile` flag, so an install that would mutate the
  lockfile fails the workflow rather than silently drifting.

## Verification

Read `package.json` and assert the `engines.node` constraint and
the `packageManager` field's pnpm version. Confirm `pnpm-lock.yaml`
exists at the repo root. Parse both workflow YAMLs and assert
their install step invokes pnpm with `--frozen-lockfile`.
