---
uid: acceptance_criterion-5a232295
id: AC-423
type: acceptance_criterion
title: Every chrome module's scoped styling references theme custom properties exclusively
created_by: xgd
created_at: '2026-06-25T00:57:30.583657+00:00'
updated_at: '2026-06-25T00:57:30.583657+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

The scoped CSS for each chrome module (header, hero, footer) refers to colors, spacing, typography, container widths, radii, and shadows through theme custom properties (`var(--color-*)`, `var(--space-*)`, `var(--font-family-*)`, `var(--font-size-*)`, `var(--font-weight-*)`, `var(--line-height-*)`, `var(--container-*)`, `var(--radius-*)`, `var(--shadow-*)`). The styling contains no hard-coded color values, font families, or spacing values for theme-governed dimensions, and the rendered markup does not carry inline color or spacing styles.

## Verification

For each chrome module, inspect the module's scoped CSS and assert it contains at least one `var(--color-*)` and one `var(--space-*)` reference. Assert it does not contain hex color literals (apart from any neutral-utility colors permitted by the framework's policy) or hard-coded font-family declarations. Render each module and assert the produced markup contains no `style="..."` attribute on the module's root element that would override a theme-governed property.
