---
uid: acceptance_criterion-772a67d7
id: AC-417
type: acceptance_criterion
title: Header collapses to a hamburger control below the md breakpoint and expands
  at and above it
created_by: xgd
created_at: '2026-06-25T00:57:00.584836+00:00'
updated_at: '2026-06-25T00:57:00.584836+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendered header markup includes a hamburger toggle control intended for narrow viewports and a navigation region whose visibility is governed by the `md` breakpoint:

- The toggle control is present in the markup with an accessible name and an aria-controls reference to the navigation region.
- The header's scoped styling hides the navigation list and shows the toggle below the `md` breakpoint, and inverts this (showing the navigation list, hiding the toggle) at and above the `md` breakpoint.

## Verification

Render the header module and assert the HTML contains a toggle element (button) with an aria-controls attribute pointing at the navigation region, and that the navigation region is present in the DOM. Inspect the module's scoped CSS and assert it contains a media query at `min-width: <md breakpoint>` (or equivalent) that shows the navigation region and hides the toggle.
