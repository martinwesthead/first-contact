---
uid: request-65dcc242
id: REQ-43
type: request
title: Module:icon-row@v1
created_by: xgd
created_at: '2026-06-20T21:14:29.736465+00:00'
updated_at: '2026-06-20T23:11:19.743776+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - f2d95081bb21b3a284efe4910bc890290009c528
  version: 0.0.22
---

A horizontal strip of icons or logos with optional labels. Used for trust badges, "as seen in", certifications, or feature highlights with icons.

- **Variants:** `logos`, `features`

- **Dials:**

- `columns`: `3`, `4`, `5`, `6`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse`

- **Content fields:**

- `heading` — string (optional)

- `items[]` — array of:

- `image` — asset-ref (logo or icon)

- `label` — string (optional)

- `href` — string (optional link)

---

## Implementation Scope (agreed 2026-06-20)

**Module id:** `logo-strip` (filed under request ticket title `Module:icon-row@v1` for legacy reasons; framework id uses `logo-strip`).

**Variant behavior:**
- `logos` — image-dominant. Image rendered larger, label suppressed visually (still emitted as `alt` text on the image for a11y). Use for trust badges / "as seen in".
- `features` — image + label equally weighted. Smaller icon with label displayed beneath it. Use for feature highlights.

**`columns` dial responsive degradation:**
- Mobile (<768px): always 2 columns for `logos`, 1 column for `features`.
- Tablet (768–1023px): half desktop count, rounded up — 6→3, 5→3, 4→2, 3→2.
- Desktop (≥1024px): as configured.

**`href` behavior:**
- When present, the whole item (image + label container) becomes a single anchor.
- External URLs (starting with `http://`, `https://`, or `//`) get `target="_blank"` and `rel="noopener noreferrer"`.

**`label` field on `logos` variant:**
- Used as `alt` text for the image. Not rendered visually.
- On `features` variant: rendered visually beneath the icon AND used as `alt` text.

**Heading:**
- When present, rendered with the same heading treatment as `services-grid` (h2, heading font, bold, 3xl).

**Required fields validation:** `items[]` (min 1, max 12), each item requires `image`. `label` and `href` optional.

## Acceptance criteria (UAT)
1. Module is registered in the framework catalog as `logo-strip@v1`.
2. Required-field validation: missing `items` rejected; item without `image` rejected.
3. `variant=logos` emits `--variant-logos` class; `variant=features` emits `--variant-features` class.
4. `columns` dial value emits the corresponding `--columns-{N}` class.
5. Optional fields (`heading`, `label`, `href`) absent → no DOM emitted for them; present → emitted.
6. When `href` is present, the rendered item is wrapped in an `<a>` tag with that href.