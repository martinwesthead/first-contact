---
uid: story-24c2b820
id: STORY-67
type: story
title: Framework catalog provides the logo-strip content module
created_by: xgd
created_at: '2026-06-29T23:44:19.245819+00:00'
updated_at: '2026-06-29T23:49:57.254213+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-d3d73016
  capability_uid: capability-3630a42c
  story_kind: feature
  story_points: 2
---

## Story
**As a** site author (operator or AI assistant composing a customer site), **I want** a `logo-strip` content module that lays out a row of logos or labeled icons, **so that** I can add trust badges, partner logos, "as seen in" strips, or icon-based feature highlights to a page without writing custom code.

## Description
The `logo-strip` module is a horizontal strip of small same-size images (logos or icons), each optionally labeled and optionally linked. It is a content-bucket entry in the framework module catalog, selectable like any other module by id and version (`logo-strip`, v1).

In scope:
- Two visual **variants**:
  - `logos` — image-dominant (trust badges, partner logos, "as seen in"). The item label is *not* rendered as visible text; it is used as the image's alt text for accessibility.
  - `features` — icon + label highlights. The label is rendered as visible text beneath the icon *and* used as alt text.
- A `columns` dial (`3`/`4`/`5`/`6`) controlling the desktop column count, with automatic responsive degradation on smaller viewports.
- Standard layout dials: `spacingTop`, `spacingBottom`, `surface` (`default`/`subtle`/`inverse`).
- Content: an optional `heading` and a required `items` list (min 1, max 12), where each item requires an `image` and may carry an optional `label` and optional `href`. When an item has an `href`, the whole item becomes a link; external links open in a new tab safely.
- Required-field validation that rejects content with no items, an empty items list, or any item missing its image.
- A convert-flow selection bullet so the AI authoring assistant knows when to choose `logo-strip`.

Out of scope: the module renders the operator-supplied palette/assets as-is; it does not fetch, resize, or validate remote images. Carousels/animation are not part of this module.

## Technical Context
- Belongs to the **Framework Module Catalog** capability (CAP-34, `capability-3630a42c`), alongside the other chrome and content modules. Selectable through the same catalog lookup contract as every registered module (by `id`/`version`).
- **Naming divergence (intent vs. implementation):** the originating request is titled `Module:icon-row@v1` (REQ-43) "for legacy reasons", but the implemented framework module id is `logo-strip` (agreed 2026-06-20 in the ticket scope). Stories and ACs document the implemented id `logo-strip`; the `icon-row` title is historical only.
- The `columns` dial drives responsive degradation via the rendered layout (mobile: 2 columns for `logos`, 1 for `features`; tablet: half the desktop count rounded up — 6→3, 5→3, 4→2, 3→2; desktop: as configured). The directly observable contract at the rendered-markup boundary is the emitted `--columns-{N}` class (default `4` when the dial is absent); the breakpoint behavior itself is layout/CSS.
- href anchoring is implemented in the renderer (external URLs — `http://`, `https://`, or protocol-relative `//` — receive `target="_blank"` and `rel="noopener noreferrer"`). The FC UAT suite directly proves registration, required-field validation, variant classes, and the columns class; the anchor-wrapping and external-link-safety behavior is grounded in the implementation and intent AC, and is enforced by regression.
- The convert-flow LLM context exists in two byte-for-byte-mirrored locations (the reproducing-a-website doc and the control-app llm-context); both gained the `logo-strip` selection bullet. The mirror drift-guard is owned elsewhere; this story records that the bullet documents `logo-strip` selection.

## Dependencies
None.

## Story Points
2