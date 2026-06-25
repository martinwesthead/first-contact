---
uid: acceptance_criterion-dce52807
id: AC-416
type: acceptance_criterion
title: Header top-nav variant renders the logo and one anchor per navigation entry
created_by: xgd
created_at: '2026-06-25T00:56:55.071520+00:00'
updated_at: '2026-06-25T00:56:55.071520+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the header module with the `top-nav` variant produces HTML that contains:

- The site logo, rendered as an image when the logo content is an asset reference (with the asset's src and alt attributes) and as text otherwise.
- One anchor element per supplied navigation entry, with each anchor's visible text matching the entry's label and each anchor's href resolved from the entry's navigation target.

## Verification

Render the header module with a logo (asset reference) and a non-empty list of navigation entries (mixing page, anchor, and url target kinds). Assert the rendered HTML contains an image element with the supplied logo's src and alt, and one anchor per entry whose text equals the entry's label and whose href matches the expected resolution (`/`, `/<page-id>`, `<base>#<module-id>`, or the literal url).
