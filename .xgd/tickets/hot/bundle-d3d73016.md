---
uid: bundle-d3d73016
id: BUNDLE-7
type: bundle
title: REQ-39 + REQ-40 + REQ-42 + REQ-43 + REQ-48 + 1 more
created_by: xgd
created_at: '2026-06-29T23:03:56.225789+00:00'
updated_at: '2026-06-30T00:39:57.141867+00:00'
completed_at: '2026-06-30T00:39:55.084427+00:00'
last_field_updated: result
status: free_and_reconciled
fields:
  commits:
  - 622593b617bfea42a7d249ff147f142601f78caf
  auto_merge_back: true
  priority: medium
  merged_at_commit: 622593b617bfea42a7d249ff147f142601f78caf
result: pass
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-39: Module: split-section@v1

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


---

## REQ-40: Module: testimonials@v1

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


---

## REQ-42: Module:banner@v1

A full-width strip with a bold statement and optional CTA. Used for announcements, section dividers, or calls to action between content sections.

- **Variants:** `simple`, `with-cta`

- **Dials:**

- `size`: `sm`, `md`, `lg`

- `align`: `left`, `center`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- **Content fields:**

- `eyebrow` — string (optional)

- `heading` — string

- `subhead` — string (optional)

- `cta` — `{ label, href }` (optional)


## Implementation scope (2026-06-20)

Module ID `banner`, version 1. Decisions on spec ambiguities:

- **`subhead` is `markdown`** (not plain `string`), matching `hero.subhead`. Operators expect inline links/emphasis in subheads.
- **Variants are visual-only.** `simple` and `with-cta` differ in layout/CTA styling; the CTA renders iff the `cta` content field is present (regardless of variant). `cta` stays optional in the content schema.
- **Default dial values:** `size=md`, `align=left`, `surface=default`, `spacingTop=6`, `spacingBottom=6` (tighter than hero's 12 — banners sit between sections).

### Touchpoints
- `packages/framework/src/modules/banner/{meta.ts,index.astro}` (new)
- `packages/framework/src/modules/{registry,index,meta}.ts` — register & re-export
- `packages/framework/src/render/markdown.ts` — add to `METAS_BY_ID`
- `packages/builder-ui/src/catalog.ts` — add to `ALL`
- `docs/llm-context/reproducing-a-website.md` — list `banner.subhead` alongside other markdown fields
- Tests: `tests/test_UAT_FC_REQ-42_banner_*.test.ts`


## Attribution note

Concurrent free-coding sessions across REQ-39/40/41/42/43 caused interleaving file writes. The banner module source files (`packages/framework/src/modules/banner/{meta.ts,index.astro}`) and the three REQ-42 UAT tests landed in commit `499b074` alongside REQ-39's split-section version bump. That SHA is attributed to REQ-39 in the ticket index.

REQ-42's own commits:
- `4737cc2` — registry.ts + index.ts entries for banner (the wiring required for `getModule("banner", 1)` to resolve)
- `e505d92` — version bump 0.0.21 → 0.0.22

All 8 REQ-42 UATs (`test_UAT_FC_REQ-42_*`) pass after the registration commit.

The cross-ticket attribution should be smoothed by reconcile; the banner-scoped facts (REGISTRY entry, version bump) are cleanly on this ticket.


---

## REQ-43: Module:icon-row@v1

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


---

## REQ-48: Text/Background Color Safety

**Type:** Framework + Instructions

## Problem
Transcribed theme tokens can produce unreadable text/background combinations (e.g. light text on light surface) because the per-surface foreground/background assignment is fixed by CSS but the palette tokens are operator/AI input.

## Framework fix (implemented)
Added `contrastRatio` and `evaluateSurfaceContrast` in `packages/framework/src/tokens/contrast.ts`. Each module-surface pair is scored against WCAG AA:
  - `default` (palette.bg ↔ palette.text) — 4.5:1
  - `subtle` (palette.surfaceSubtle ↔ palette.text) — 4.5:1
  - `inverse` (palette.surfaceInverse ↔ palette.bg) — 4.5:1
  - `accent` (palette.accent ↔ palette.bg) — 3.0:1 (CTA / large-text surface)

`generateThemeCss` runs the evaluator on the merged palette and prepends a `/* fc-contrast-warning: <surface> — <fg> on <bg> = <ratio>:1 (below WCAG AA <threshold>:1) */` comment to the stylesheet for each failing pair. It also emits a single `console.warn` naming the failing surface(s). The site still renders the operator's palette as-is — warning, not auto-correct or block.

Verified end-to-end: building the bundled `1stcontact` site triggers `[1stcontact] theme contrast below WCAG AA on surface(s): accent` (the default `#f59e0b` accent on white is 2.15:1 — a genuine finding).

## Instructions fix (implemented)
`docs/llm-context/reproducing-a-website.md` now carries a section `1a` between "apply theme tokens" and "add missing pages" that documents the four surface pairs and the WCAG relative-luminance formula, instructs the AI to compute the ratio per pair and re-issue `set_theme_token` to swap or fall back to defaults when a pair fails. The inlined copy in `apps/control-app/src/llm-context.ts` is kept byte-for-byte in sync (REQ-30 drift guard).

## Why this is free-coded
Narrowly scoped: one utility module, one CSS-emit hook, one doc section. No new public tool surface; no schema migration.

## Test plan
UATs under `tests/test_UAT_FC_REQ-48_*.test.ts`:
  - `contrast_ratio_math` — WCAG relative-luminance + ratio against known fixtures (black/white = 21:1, mid-grey pair below 4.5, 3-digit hex shorthand).
  - `surface_contrast_evaluation` — one `ContrastPair` per surface with correct bg/fg mapping; body threshold 4.5 for default/subtle/inverse; flags subtle when palette pushes below threshold.
  - `theme_css_emits_contrast_warnings` — no warning on a constructed clean palette; `/* fc-contrast-warning: subtle ... */` on a failing palette; names multiple failing surfaces; warning does not replace the `:root` block; single `console.warn` per call naming the failing surfaces.

## Commits
  - `f2d9508` — doc edit to `reproducing-a-website.md` (section 1a, contrast verification step) — auto-bundled into REQ-43's logo-strip commit by xgd sync.
  - `9a5a848` — framework utility + `generateThemeCss` integration + `apps/control-app/src/llm-context.ts` drift-guard sync + REQ-48 UATs.
  - `6b2c84d` — patch version bump (0.0.22 → 0.0.23).


---

## REQ-47: Image Sizing & Controls

**Type:** Framework + Instructions

**Problem:** Images render at native resolution with no constraints, causing oversized images in hero and grid modules.

**Framework fix:** Modules with image fields should constrain images by default (e.g. `object-fit: cover`, max dimensions per module type). Optionally expose an `imageSize` dial (e.g. `cover`, `contain`, `sm`, `md`, `lg`) so the AI can make intentional choices.

**Instructions fix:** During convert, AI should match image sizing intent from the source site when an `imageSize` dial is available.

---

## Audit (2026-06-20)

| Module | Image source | State |
|---|---|---|
| header / footer | logo img | ✅ capped (max-height) |
| hero bg-image | structured | ✅ absolute fill + object-fit: cover |
| hero bg-color | declared `image` field, never rendered | ⚠️ separate dormant-field bug — OUT OF SCOPE |
| split-section image | structured + `imageRatio` dial | ✅ already constrained |
| image-gallery grid | structured | ✅ aspect 1:1 + cover |
| image-gallery masonry | structured | ⚠️ `height: auto` — no cap |
| testimonials avatar | structured | ✅ 64×64 + cover |
| services-grid icon | structured | ✅ 2.5rem container |
| logo-strip image | structured | ✅ max-height bucket + contain |
| **All markdown bodies** | inline `<img>` via `set:html` | ⚠️ NO img scoping — native pixel size |

Markdown bodies affected: hero.subhead, text-block.body, services-grid.subhead, services-grid.items[].body, split-section.body, testimonials.items[].quote, banner.subhead.

## Acceptance Criteria

**AC1: Markdown img scoping** — Every module that renders a markdown body via `set:html` constrains inline `<img>` elements with `max-width: 100%; height: auto; display: block;` scoped to the body. Verified by per-module UAT.

**AC2: `imageSize` dial on image-gallery** — `image-gallery` meta declares `imageSize: ['sm','md','lg']`. The masonry variant applies `max-height` caps per value (sm/md/lg). Grid variant is unaffected (fixed 1:1). Default = `md`.

**AC3: LLM instructions document `imageSize`** — `docs/llm-context/reproducing-a-website.md` mentions `imageSize` on image-gallery and tells convert to match source intent. The mirrored `apps/control-app/src/llm-context.ts` is updated byte-for-byte.

## Out of scope

- Hero `bg-color` image rendering (dormant field) — needs its own ticket.
- Adding `imageSize` to other modules (split-section has `imageRatio`; logo-strip has fixed buckets; etc.).