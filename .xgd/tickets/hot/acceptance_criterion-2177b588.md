---
uid: acceptance_criterion-2177b588
id: AC-407
type: acceptance_criterion
title: Supplying a dark palette adds a prefers-color-scheme:dark block that overrides
  only the supplied color roles
created_by: xgd
created_at: '2026-06-25T00:49:33.337023+00:00'
updated_at: '2026-06-25T00:49:33.337023+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

When the generator is invoked with an optional dark-palette override
alongside the base tokens, the produced stylesheet includes:
- The base `:root` block (unchanged in shape and content).
- A `@media (prefers-color-scheme: dark)` block wrapping a `:root`
  selector. The dark block contains exactly the `--color-<role>` custom
  properties for the roles supplied in the dark palette, set to the
  supplied dark values. No other slots appear inside the dark block — the
  non-color properties remain inherited from the base `:root` block.

When no dark palette is supplied, the stylesheet contains no
`@media (prefers-color-scheme: dark)` block.

## Verification

- Invoke the generator with a dark palette specifying a subset of color
  roles (e.g. `bg`, `text`, `surface`). Assert the output contains an
  `@media (prefers-color-scheme: dark)` block whose nested `:root`
  declares exactly those overridden color custom properties with the
  supplied values, and contains no other custom properties.
- Invoke the generator without a dark palette. Assert the output contains
  no `prefers-color-scheme` text.
