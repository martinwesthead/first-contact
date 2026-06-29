---
uid: acceptance_criterion-524f1541
id: AC-442
type: acceptance_criterion
title: Framework module registry resolves all six Phase 0 modules (header, hero, footer,
  text-block, services-grid, contact-form) at their declared versions
created_by: xgd
created_at: '2026-06-25T01:12:43.469928+00:00'
updated_at: '2026-06-29T22:33:55.570287+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

The framework's module registry resolves each catalog module id — `header`, `hero`, `footer`, `text-block`, `services-grid`, `contact-form`, and `image-gallery` — at the version declared by that module's meta, returning the module's component and meta. In particular, `image-gallery` resolves at `v1` alongside the existing Phase 0 modules.

## Verification

For each catalog module id, look up the module in the registry at the version declared by its meta and assert that resolution succeeds and returns an entry containing both the module's meta (with matching id and version) and its renderable component. Assert specifically that resolving (`image-gallery`, version 1) returns the image-gallery meta and a component. Also assert the registry's listing of registered modules contains each id, including `image-gallery`.
