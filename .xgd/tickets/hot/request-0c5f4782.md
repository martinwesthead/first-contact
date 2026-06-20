---
uid: request-0c5f4782
id: REQ-39
type: request
title: 'Module: split-section@v1'
created_by: xgd
created_at: '2026-06-20T21:10:54.218719+00:00'
updated_at: '2026-06-20T23:07:01.842571+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 3f6cb5ef8c57f66d35b01c38f35215fca33f6a54
  - 499b074de6f20e4fca29f47dbc28bfd80fb0a029
  version: 0.0.20
---

This is the single highest-value missing module. It's an image on one side, text on the other — used constantly on small business sites.

- **Variants:** `image-left`, `image-right`

- **Dials:**

- `size`: `sm`, `md`, `lg` (controls text size and section height)

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- `imageRatio`: `square`, `portrait`, `landscape` (controls the image column's aspect ratio)

- **Content fields:**

- `image` — asset-ref

- `eyebrow` — short string (optional label above heading)

- `heading` — string

- `body` — markdown

- `cta` — `{ label, href }` (optional)(new ticket)


---

## Scope (free-coded)

### Module identity
- `id`: `split-section`, `version`: 1
- Location: `packages/framework/src/modules/split-section/{meta.ts,index.astro}`
- Registered in `packages/framework/src/modules/registry.ts`
- Exported from `packages/framework/src/modules/index.ts` (named exports: `SplitSection`, `splitSectionMeta`)

### Variants
- `image-left` — image column on the left, text column on the right (desktop)
- `image-right` — image column on the right, text column on the left (desktop)

### Dials (with defaults)
- `size`: `sm | md | lg` — default `md`. Controls text scale and section vertical padding scale.
- `spacingTop`: `0,1,2,3,4,6,8,12,16,24` — default `12`
- `spacingBottom`: `0,1,2,3,4,6,8,12,16,24` — default `12`
- `surface`: `default | subtle | inverse | accent` — default `default`
- `imageRatio`: `square | portrait | landscape` — default `landscape`

### Content schema
- `image` — `asset-ref`, **required**
- `eyebrow` — `string`, optional
- `heading` — `string`, **required**
- `body` — `markdown`, **required**
- `cta` — object `{ label: string (required), href: url (required) }`, optional

### Layout behavior
- Desktop (≥768px): two columns side-by-side. Image column ordered by variant.
- Mobile (<768px): always stacks image-first, then text (regardless of variant). Predictable, image-as-hook.
- Container: `--container-default`.
- Text column: left-aligned (no `align` dial).
- Image aspect ratio applied to the image column via CSS `aspect-ratio` driven by `imageRatio`.
- CTA: filled-primary button styled to match hero CTA.

### Surface / spacing
- Uses the same `--space-N` token scale and `--color-surface-*` palette as hero/services-grid.

### UAT plan (named `test_UAT_FC_REQ-39_*`)
1. `image_left_renders_image_before_text_in_dom` — variant `image-left` emits image element before text block in source order.
2. `image_right_renders_text_before_image_in_dom` — variant `image-right` reverses DOM order.
3. `applies_image_ratio_class` — passing `imageRatio=portrait` produces the corresponding class on the image column.
4. `omits_eyebrow_and_cta_when_not_provided` — optional fields don't render when absent.
5. `registry_includes_split_section_v1` — `listRegisteredModules()` contains `{id:"split-section", version:1}` and `getModule` resolves it.
6. `validates_required_content_fields` — `validateModuleContent` rejects missing `image`, `heading`, or `body`.

### Out of scope
- No schema migration (modules register at framework boundary only).
- No generator changes (existing renderer handles new module via registry).
- No content-app changes.