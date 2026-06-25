---
uid: acceptance_criterion-2e49a172
id: AC-404
type: acceptance_criterion
title: Supplied token values appear verbatim on the right-hand side of their CSS custom
  property
created_by: xgd
created_at: '2026-06-25T00:49:09.241406+00:00'
updated_at: '2026-06-25T00:49:09.241406+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

Each value in the supplied theme-token input is preserved character-for-
character as the value of the corresponding CSS custom property. The
generator does not normalize, reformat, or alter the supplied strings.

## Verification

Invoke the generator with distinctive values for several slots (e.g.
palette `primary: "#abcdef"`, `space-4: "1.2rem"`, `font-family-heading:
"'Manrope', system-ui, sans-serif"`). Assert each value appears verbatim
on the right-hand side of the appropriate custom property (e.g.
`--color-primary: #abcdef;`, `--space-4: 1.2rem;`).
