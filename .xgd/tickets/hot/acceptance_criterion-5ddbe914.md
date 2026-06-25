---
uid: acceptance_criterion-5ddbe914
id: AC-408
type: acceptance_criterion
title: Framework publishes a vetted Google Fonts shortlist of 13 fonts, each with
  stable metadata
created_by: xgd
created_at: '2026-06-25T00:49:42.138920+00:00'
updated_at: '2026-06-25T00:49:42.138920+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

The framework publishes a vetted Google Fonts shortlist whose membership
is exactly these 13 fonts: Inter, Manrope, Fraunces, Playfair Display,
Space Grotesk, DM Serif Display, Outfit, Sora, Source Sans 3, IBM Plex
Sans, Lora, Merriweather, Work Sans.

Each entry in the shortlist exposes:
- A stable identifier slug (kebab-cased) — used as a durable key for
  cross-system references.
- The canonical family name as it appears in CSS font-family
  declarations (e.g. `"Playfair Display"`).
- The family name encoded for Google Fonts URLs (e.g. `"Playfair+Display"`).
- A list of supported font weights (numeric strings) for the family.
- A category label of either `"display"` or `"body"`.

## Verification

Read the published shortlist. Assert it contains exactly the 13 family
names listed above. For at least one display-category and one body-
category entry, assert the URL-encoded family name correctly encodes
spaces (e.g. `"Playfair+Display"`, `"Work+Sans"`) and the weights list
is non-empty.
