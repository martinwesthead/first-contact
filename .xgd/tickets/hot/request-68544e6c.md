---
uid: request-68544e6c
id: REQ-41
type: request
title: 'Module: image-gallery@v1'
created_by: xgd
created_at: '2026-06-20T21:12:40.973991+00:00'
updated_at: '2026-06-20T22:43:31.610668+00:00'
completed_at: null
last_field_updated: status
status: ready_to_implement
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

A grid of photos. Used for food photography, portfolio, before/after etc.

- **Variants:** `grid`, `masonry`

- **Dials:**

- `columns`: `2`, `3`, `4`

- `gap`: `tight`, `normal`, `loose`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- **Content fields:**

- `heading` — string (optional)

- `items[]` — array of:

- `image` — asset-ref

- `caption` — string (optional)

## Converged scope (2026-06-20)

Decisions made before implementation:

- **Surface dial:** widened to `default, subtle, inverse, accent` to match the existing 4-value pattern used by other modules (services-grid, text-block).
- **Masonry implementation:** pure CSS via `column-count` — SSR-friendly, no JS hydration.
- **Item count bounds:** `items[]` enforces `min: 2, max: 24`.
- **Responsive columns:** `columns` is the desktop count; mobile collapses (`2`→`1`, `3`→`2`, `4`→`2`) at the `md` breakpoint (768px).
- **Caption rendering:** below the image, small muted text. Optional.
- **No lightbox:** plain `<img>` tags with `loading="lazy"` and `decoding="async"`. Click-to-zoom is out of scope for v1.
- **Aspect ratio:**
  - `grid` variant locks tiles to `1:1` (square) for visual consistency.
  - `masonry` variant lets natural image aspect ratios flow.

## Implementation plan

1. `packages/framework/src/modules/image-gallery/meta.ts` — exports `meta` with `id: "image-gallery"`, `version: 1`, the variants/dials/contentSchema above.
2. `packages/framework/src/modules/image-gallery/index.astro` — Astro component that renders the section with proper class hooks, supports both variants, optional heading, and per-item optional caption.
3. Register in `packages/framework/src/modules/registry.ts`.
4. Export from `packages/framework/src/modules/index.ts` (named `ImageGallery` + `imageGalleryMeta`).
5. UAT tests (named `test_UAT_FC_REQ-41_*`):
   - `grid` variant emits one tile per item and tags `data-variant="grid"`.
   - `masonry` variant uses CSS columns layout (asserts `--variant-masonry` class).
   - Optional `heading` renders when present, omitted when absent.
   - `caption` renders only when provided.
   - `columns` dial maps to the corresponding modifier class.
   - Validates rejection when `items[]` length is outside `2..24`.
