---
uid: acceptance_criterion-fb87e926
id: AC-419
type: acceptance_criterion
title: Hero bg-image variant renders the background image with the supplied src and
  alt
created_by: xgd
created_at: '2026-06-25T00:57:12.803345+00:00'
updated_at: '2026-06-25T00:57:12.803345+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the hero module with variant `bg-image` and an `image` asset reference produces markup that contains a background image element whose src equals the asset's src and whose alt equals the asset's alt.

## Verification

Render the hero module with variant `bg-image`, a heading, and an image asset reference whose src and alt are known test values. Assert the rendered HTML contains an image element marked as the hero background (via a hero-background-image marker class or data attribute) with the supplied src and alt attributes.
