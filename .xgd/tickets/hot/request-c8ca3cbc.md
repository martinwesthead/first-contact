---
uid: request-c8ca3cbc
id: REQ-40
type: request
title: 'Module: testimonials@v1'
created_by: xgd
created_at: '2026-06-20T21:12:02.247298+00:00'
updated_at: '2026-06-20T23:14:33.410108+00:00'
completed_at: null
last_field_updated: body
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 36d7728eaf1deb2c66ac8fc568dede51f4d7c5ea
  - 41bb985fc5a98996c891b29a59689c5b22b18934
  version: 0.0.21
---

Single quotes or a carousel of client quotes. Very common on service businesses.

- **Variants:** `single`, `grid`

- **Dials:**

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- `align`: `left`, `center`

- **Content fields:**

- `heading` — string (optional section heading e.g. "What clients say")

- `items[]` — array of:

- `quote` — markdown

- `name` — string

- `title` — string (optional, e.g. "Mother of two")

- `avatar` — asset-ref (optional)



## Implementation decisions (2026-06-20)

- **Variant behavior:**
  - `single` — renders only `items[0]` (no count enforcement at the schema level).
  - `grid` — `min: 2, max: 9` items.
- **Carousel:** out of scope for v1 — `grid` is a static CSS grid. A rotating variant can be added later.
- **Defaults:** `align` defaults to `center` (testimonial convention).
- **Avatar:** rendered as a circular ~64px image; `alt` from the AssetRef.
- **Quote:** rendered with `set:html` like other markdown fields (`text-block`, `services-grid`).

## Acceptance criteria (UATs)

- `UAT-1` Module registers in the framework catalog at id `testimonials` v1.
- `UAT-2` `grid` variant renders one card per item; tags section with `data-variant="grid"`.
- `UAT-3` `single` variant renders the first item only, regardless of how many are passed.
- `UAT-4` `align` dial applies an `fc-testimonials--align-${value}` class.
- `UAT-5` Avatar is rendered as an `<img>` with the AssetRef `src`/`alt` when provided; omitted when not.
- `UAT-6` Quote markdown is rendered as HTML (not escaped).



## Attribution note

Concurrent free-coding sessions across REQ-39/40/41/42/43 created interleaving file writes. The testimonials module source files (`packages/framework/src/modules/testimonials/{index.astro, meta.ts}`) and the six `test_UAT_FC_REQ-40_*` UAT tests landed in commit `3f6cb5e` alongside REQ-39's split-section work. That SHA is attributed to REQ-39.

REQ-40's own commits cleanly add the registry/exports wiring and the version bump:
- `ab0035a` — registry.ts + index.ts entries for testimonials
- `d4c5e4b` — version bump 0.0.20 → 0.0.21

All 9 REQ-40 UAT tests (`test_UAT_FC_REQ-40_*`) pass after the registration commit.



## SHA remap (2026-06-20)

Body references the original SHAs `3f6cb5e` (split-section + testimonials combined commit), `ab0035a` (testimonials registry registration), and `d4c5e4b` (version bump). These were rewritten via `git filter-branch` to fix an unrelated REQ-41 commit-message misattribution upstream in the same chain. New SHAs:

- `3f6cb5e` → `38a7320100a35ed2d003ad774f4d959301b7448e`
- `ab0035a` → `36d7728eaf1deb2c66ac8fc568dede51f4d7c5ea`
- `d4c5e4b` → `41bb985fc5a98996c891b29a59689c5b22b18934`

The `fields.commits` array has been updated accordingly.
