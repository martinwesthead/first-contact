---
uid: acceptance_criterion-e68d7fe5
id: AC-456
type: acceptance_criterion
title: Marketing site definition declares the Phase 0 seven-module home page with
  in-page-anchors navigation
created_by: xgd
created_at: '2026-06-25T01:35:07.003017+00:00'
updated_at: '2026-06-25T01:35:07.003017+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

The committed site definition for 1stcontact.io declares a single page (`home`, slug `/`) whose module list is, in order: header → hero → text-block (landing variant) → services-grid (three-col variant) → text-block (prose variant) → contact-form → footer. Site-level navigation uses the in-page-anchors pattern, with entries that target module ids on the home page.

## Verification

Loading and validating the site definition against the site schema succeeds, and the resulting structure carries:
- exactly one page with slug `/`,
- exactly seven module instances in the documented order with the documented types and variants,
- a `nav.pattern` value of `in-page-anchors` with at least one entry whose target resolves to a module id on the home page.
