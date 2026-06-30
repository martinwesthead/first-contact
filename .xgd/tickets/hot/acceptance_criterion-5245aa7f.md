---
uid: acceptance_criterion-5245aa7f
id: AC-775
type: acceptance_criterion
title: Services-grid one-col variant renders a single full-width feature-callout card
  in a narrow container
created_by: xgd
created_at: '2026-06-30T00:52:04.696368+00:00'
updated_at: '2026-06-30T00:52:04.696368+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a services-grid is rendered with the `one-col` variant, it presents its items as a single full-width column (one feature-callout card per item) and tags the section with `data-variant="one-col"` and a `one-col` variant modifier class. The single-column layout is constrained to the framework's narrow content container rather than the default grid width.

## Verification

Render a services-grid with `variant: "one-col"` and a single item; assert the rendered markup tags the section with `data-variant="one-col"` and a one-col variant modifier class and lays the item out in a single full-width column constrained to the narrow container width.
