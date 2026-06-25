---
uid: acceptance_criterion-d22e0c50
id: AC-411
type: acceptance_criterion
title: Registry resolves a known module to its component and meta
created_by: xgd
created_at: '2026-06-25T00:56:28.474369+00:00'
updated_at: '2026-06-25T00:56:28.474369+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Looking up a registered module by its declared id and version returns the module's component together with its meta. The meta exposes the module's id, version, allowed variants, allowed dials, and content schema as declared by the module.

## Verification

For each chrome module (header, hero, footer), look up the module by its declared id and version through the registry's resolution helper. Assert the returned record contains a component (renderable) and a meta whose `id` and `version` match the lookup arguments and whose `variants`, `dials`, and `contentSchema` are non-empty structures matching the module's declared contract.
