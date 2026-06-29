---
uid: acceptance_criterion-9285dee8
id: AC-764
type: acceptance_criterion
title: logo-strip variant selects logos vs features class and label visibility
created_by: xgd
created_at: '2026-06-29T23:45:01.220425+00:00'
updated_at: '2026-06-29T23:45:01.220425+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
The chosen variant is reflected in the rendered output:
- `variant=logos` renders a `--variant-logos` distinguishing class (and `data-variant="logos"`), and item labels are NOT rendered as visible label text.
- `variant=features` renders a `--variant-features` distinguishing class (and `data-variant="features"`), and each item's label IS rendered as visible label text.

## Verification
Render the module with `variant=logos` and assert the markup contains the `--variant-logos` class and `data-variant="logos"`, and contains no visible label element. Render with `variant=features` (items carrying labels) and assert the markup contains the `--variant-features` class, `data-variant="features"`, and a visible label element bearing the item's label text.
