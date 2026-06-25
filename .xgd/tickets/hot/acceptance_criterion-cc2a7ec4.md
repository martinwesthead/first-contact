---
uid: acceptance_criterion-cc2a7ec4
id: AC-415
type: acceptance_criterion
title: Every chrome module exposes meta conforming to the module contract
created_by: xgd
created_at: '2026-06-25T00:56:50.011083+00:00'
updated_at: '2026-06-25T00:56:50.011083+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Every chrome module (header, hero, footer) exposes a `meta` that conforms to the framework's module contract: it declares an `id`, an integer `version`, a non-empty `variants` enumeration, a `dials` map whose values are enumerations of accepted dial values, and a `contentSchema` describing required and optional fields with their expected types.

## Verification

For each chrome module, read its declared meta and assert: `id` is a non-empty string, `version` is a positive integer, `variants` is a non-empty array of strings, every entry in `dials` is an array of strings, and `contentSchema` is an object whose entries each declare a `type` and a `required` boolean. The shape conformance must be checkable at the type system level (the contract type accepts the meta literal) and at runtime (the declared values satisfy the contract).
