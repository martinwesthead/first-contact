---
uid: acceptance_criterion-09a53347
id: AC-399
type: acceptance_criterion
title: Theme tokens schema enforces the locked superset (palette/typography/spacing/container
  surfaces)
created_by: xgd
created_at: '2026-06-25T00:39:22.445569+00:00'
updated_at: '2026-06-25T00:39:22.445569+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

The theme-tokens surface accepts exactly the locked superset of
slots:

- palette: 9 roles — `bg`, `surface`, `surfaceSubtle`,
  `surfaceInverse`, `text`, `muted`, `primary`, `accent`,
  `border`;
- typography: `family.{heading, body}`; `scale.{xs, sm, base, lg,
  xl, 2xl, 3xl, 4xl, 5xl}`; `weights.{regular, medium, semibold,
  bold, black}`; `lineHeights.{tight, normal, relaxed}`;
- spacing: 10 geometric steps — `0`, `1`, `2`, `3`, `4`, `6`,
  `8`, `12`, `16`, `24` (keys are quoted numeric strings);
- radius: `none`, `sm`, `md`, `lg`, `full`;
- shadow: `none`, `sm`, `md`, `lg`;
- container: 4 slots — `narrow`, `default`, `wide`, `bleed`;
- breakpoints: `sm`, `md`, `lg`, `xl`.

A site whose theme tokens populate every slot above validates;
omitting any slot fails (covered by the missing-slot AC); the
palette slots additionally require hex strings (covered by the
hex-color AC). This AC fixes the slot surface itself.

## Verification

Pass a site whose theme object covers exactly the slot list above
to `validateSite()` and assert the success branch is returned.
Pass sites populating each slot group end-to-end to confirm none
is silently dropped or treated as optional.
