---
uid: acceptance_criterion-be5afa84
id: AC-755
type: acceptance_criterion
title: banner v1 is discoverable in the framework module catalog with its variants
  and dials
created_by: xgd
created_at: '2026-06-29T23:37:32.362576+00:00'
updated_at: '2026-06-29T23:37:32.362576+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
The framework module catalog exposes a `banner` module at version 1 that is resolvable by id and version and is present in the catalog surfaced to the builder UI. Its declared contract advertises exactly the variants `["simple", "with-cta"]` and the dials: `size` = [sm, md, lg], `align` = [left, center], `surface` = [default, subtle, inverse, accent], `spacingTop` and `spacingBottom` = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24].

## Verification
Query the registered module list and the builder-facing catalog; assert a banner/v1 entry exists, that it resolves to a renderable module, and that its advertised variants and dial value sets match the listed values exactly.
