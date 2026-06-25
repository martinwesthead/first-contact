---
uid: acceptance_criterion-28a421e5
id: AC-457
type: acceptance_criterion
title: Marketing site definition uses Manrope/Inter typography and the primary/accent
  palette
created_by: xgd
created_at: '2026-06-25T01:35:15.476203+00:00'
updated_at: '2026-06-25T01:35:15.476203+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

The committed site definition declares its heading-family typography as a family-declaration string containing `Manrope`, its body-family typography as a family-declaration string containing `Inter`, its primary palette colour as `#2563eb`, and its accent palette colour as `#f59e0b`.

## Verification

Reading the site definition and validating it against the site schema succeeds, and the resulting `theme.typography.family.heading` value contains the literal `Manrope`, `theme.typography.family.body` contains the literal `Inter`, `theme.palette.primary` equals `#2563eb`, and `theme.palette.accent` equals `#f59e0b`.
