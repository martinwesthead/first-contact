---
uid: request-c8ca3cbc
id: REQ-40
type: request
title: 'Module: testimonials@v1'
created_by: xgd
created_at: '2026-06-20T21:12:02.247298+00:00'
updated_at: '2026-06-20T22:56:49.207074+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
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
