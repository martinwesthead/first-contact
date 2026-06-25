---
uid: acceptance_criterion-3b44063b
id: AC-403
type: acceptance_criterion
title: Generated stylesheet contains a :root block with a CSS custom property for
  every locked theme slot, named deterministically
created_by: xgd
created_at: '2026-06-25T00:49:04.928391+00:00'
updated_at: '2026-06-25T00:49:04.928391+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

The CSS produced from a fully-specified set of theme tokens begins with a
`:root` selector and contains one CSS custom property per slot in the
Phase-0 locked superset, using the published kebab-cased naming
convention:

- 9 palette roles → `--color-<role>` (`--color-bg`, `--color-surface`,
  `--color-surface-subtle`, `--color-surface-inverse`, `--color-text`,
  `--color-muted`, `--color-primary`, `--color-accent`, `--color-border`)
- 2 typography families → `--font-family-<name>` (`--font-family-heading`,
  `--font-family-body`)
- 9 typography scale steps → `--font-size-<step>` (`xs`, `sm`, `base`,
  `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`)
- 5 typography weights → `--font-weight-<name>` (`regular`, `medium`,
  `semibold`, `bold`, `black`)
- 3 typography line heights → `--line-height-<name>` (`tight`, `normal`,
  `relaxed`)
- 10 spacing steps → `--space-<step>` (`0`, `1`, `2`, `3`, `4`, `6`, `8`,
  `12`, `16`, `24`)
- 5 radii → `--radius-<name>` (`none`, `sm`, `md`, `lg`, `full`)
- 4 shadows → `--shadow-<name>` (`none`, `sm`, `md`, `lg`)
- 4 containers → `--container-<name>` (`narrow`, `default`, `wide`,
  `bleed`)
- 4 breakpoints → `--breakpoint-<name>` (`sm`, `md`, `lg`, `xl`)

Multi-word slot names (e.g. `surfaceSubtle`) appear in their kebab-cased
form (`--color-surface-subtle`). The `:root` block opens and closes.

## Verification

Invoke the published theme-to-CSS generator with a fully-specified token
set. Assert the produced text starts a `:root` block, contains each of
the 55 enumerated custom-property names above, and contains a closing
brace for the `:root` block. Assert that `surfaceSubtle` and
`surfaceInverse` palette roles appear as `--color-surface-subtle` and
`--color-surface-inverse` respectively.
