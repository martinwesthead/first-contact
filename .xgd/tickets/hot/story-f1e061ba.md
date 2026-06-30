---
uid: story-f1e061ba
id: STORY-42
type: story
title: 'Framework module catalog: content modules (text-block, services-grid, contact-form)
  with progressive-enhancement form and validator extensions'
created_by: xgd
created_at: '2026-06-25T01:11:07.589587+00:00'
updated_at: '2026-06-30T00:52:54.843734+00:00'
completed_at: null
last_field_updated: status
status: updated
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-3630a42c
  story_kind: upgrade
  story_points: 3
  uat_coverage: pass
  updated_by:
  - bundle-4e8020d6
  - bundle-d3d73016
---

## Story

**As a** site author or generator/preview consumer,
**I want** content modules — text-block, services-grid, contact-form, and image-gallery — that conform to the framework's module contract and make up the framework catalog,
**so that** any site can render long-form prose, a services overview, a progressively-enhanced lead-capture form, and a photo gallery from structured content with predictable variants, dials, validation, and a no-JS fallback.

## Description

This story covers the framework catalog's content modules and the content-shape kinds they introduce. Together with the chrome modules (header, hero, footer) they form the module surface used by the marketing site and the builder preview.

In scope:

- **text-block** — two variants. `prose` constrains content to the narrow container (intended for articles, founder notes, terms). `landing` uses the default container (intended for marketing manifestos). Renders markdown body content including at least headings, lists, links, images, blockquotes, and code blocks. Inline `<img>` elements in the markdown body are constrained to `max-width: 100%; height: auto; display: block` so embedded images cannot overflow the layout. The heading element is omitted when no heading is supplied. Dials: `size` (sm/md/lg), `textAlign` (left/center), `spacingTop`, `spacingBottom`, `surface`.
- **services-grid** (`services-grid@v2`) — three variants. `three-col` and `two-col` render their target column count at and above the `md` breakpoint and collapse to a single column below; `one-col` presents a single full-width feature-callout card in a single column constrained to the narrow container (for one highlighted service rather than a grid). Each item is an object with an optional `image` (asset ref only — no string fallback), a required `heading`, a required markdown `body`, and an optional CTA `{label, href}`. Inline `<img>` elements in the rendered markdown bodies (the optional subhead and each item body) are constrained to `max-width: 100%; height: auto; display: block`. Item count is validated 1..6 (one-col feature callouts allow a single item). Dials: `gap` (tight/normal/loose), `imageStyle` (icon/cover/thumb — controls how each item image is sized within its card: `icon` a small square pictogram default, `thumb` a fixed ~6rem square, `cover` a full-bleed 16:9 banner at the top of the card), `spacingTop`, `spacingBottom`, `surface`.
- **contact-form** — one variant (`inline`). Renders one labeled input per configured field with the field's type (text/email/tel/textarea), name, label, and required attribute. The form targets the configured `action` URL. A hidden honeypot field is visually concealed. A Turnstile mount-target element is present so the actual widget (wired in the lead-capture story) can attach without further markup changes. Without JS the form submits via standard HTML POST to the action URL. With JS, the form's submit is intercepted, the data is posted as a JSON request body, the form is replaced with the configured `successMessage` (or a default thank-you when not supplied) on a 2xx response, and an inline error is surfaced on a non-2xx response without navigating. Dials: `align` (left/center), `spacingTop`, `spacingBottom`, `surface`.
- **image-gallery** (`image-gallery@v1`) — two variants. `grid` lays tiles out in a CSS grid with each image locked to a 1:1 aspect ratio (`object-fit: cover`); `masonry` uses a pure-CSS `column-count` layout (no JS hydration) that lets natural image aspect ratios flow. The section is tagged `data-module="image-gallery"` and `data-variant="<variant>"`. An optional `heading` renders only when supplied; each item carries a required `image` (asset ref) rendered as a plain `<img>` with `loading="lazy"` and `decoding="async"` (no lightbox), plus an optional `caption` rendered as muted text below the image only when provided. `items[]` is validated 2..24. Dials: `columns` (2/3/4, default 3, emitted as a `--cols-N` modifier class), `gap` (tight/normal/loose), `imageSize` (sm/md/lg, default md, emitted as a `--image-N` modifier class), `spacingTop`, `spacingBottom`, `surface` (default/subtle/inverse/accent). The `imageSize` dial caps image height in the `masonry` variant only — `sm`/`md`/`lg` map to progressively larger `max-height` caps with `object-fit: contain`, so a single tall image cannot dominate the column flow; the `grid` variant's fixed 1:1 `object-fit: cover` tiles are unaffected by the dial. Below the `md` breakpoint the gallery collapses to a single column; the per-`columns` layout applies at and above `md`.
- **Content validator extensions** — the framework's content validator accepts the new shape kinds introduced by these modules: `list-of` (with optional `min`/`max`), nested `object`, and `enum`, in addition to primitive types. image-gallery's `items[]` reuses this `list-of` of nested `object` shape with `min: 2, max: 24`.
- **Registry coverage** — the framework module registry resolves all catalog modules (header, hero, footer, text-block, services-grid, contact-form, image-gallery) at their declared versions — in particular services-grid at `v2` and image-gallery at `v1`.
- **Convert-flow LLM context** — the convert-flow documentation (and its byte-for-byte runtime mirror) documents the image-gallery `imageSize` dial, names its `sm`/`md`/`lg` values, and instructs convert to set the dial to match how prominent images are in the source site. It also documents the services-grid item shape (`{ heading, body, image?, cta? }`), notes the optional `image` is an asset-ref object with no string fallback, and explains the section-level `imageStyle` dial (`icon`/`cover`/`thumb`) and the `one-col` variant for a single full-width feature callout.

Out of scope (covered by other stories):

- The contact-form HTTP handler, D1 leads schema, Turnstile script loading, and Resend notification (Lead Capture Pipeline story).
- The static generator that renders these modules into HTML (Static Site Generator story).
- The actual marketing-site content for these modules (Public Site Worker story).

## Technical Context

- Modules conform to the contract introduced in CAP-34 (chrome modules story), so every content module exports a `moduleMeta` declaring `id`, `version`, allowed `variants`, allowed `dials`, and a `contentSchema`. This story adds the `list-of`, nested `object`, and `enum` content-shape kinds the chrome modules did not exercise; image-gallery reuses `list-of` + nested `object`.
- The contact-form's progressive enhancement is a small client-side island that intercepts submit, gathers form fields, optionally reads a Turnstile token from a sibling mount, and posts JSON to the action URL. The form must remain fully functional with no JS — the no-JS HTML POST path is a first-class contract, not a fallback.
- The Turnstile mount target is a passive marker; the actual Turnstile widget script and challenge enforcement are wired by the Lead Capture Pipeline story.
- The content validator is the same validator used by the chrome modules; the additions here extend its accepted shape grammar without changing the validator's interface.
- The registry is the same registry introduced by the chrome modules story; this story extends its membership to include image-gallery.
- image-gallery is purely server-rendered: both variants are static markup + CSS with no client-side JS. The masonry layout is achieved with CSS `column-count`, so it is SSR-friendly with no hydration.
- **Responsive-collapse note (code vs. original REQ-41 brief):** the original REQ-41 text described per-count mobile collapse (2→1, 3→2, 4→2). The shipped implementation instead collapses *every* `columns` value to a single column below the `md` (768px) breakpoint, applying the chosen 2/3/4-column layout only at and above `md`. The matrix documents the implemented single-column collapse, which is what the FC tests exercise; the per-count partial collapse was not implemented.
- **Image-safety upgrade (REQ-47):** during reconciliation of bundle-d3d73016 this story gained (a) the image-gallery `imageSize` dial and masonry-only height caps documented above, and (b) the markdown-body inline-`<img>` constraint on text-block and services-grid. The cross-cutting markdown-`<img>` acceptance criterion (covering hero, text-block, services-grid, split-section, testimonials, banner) is owned by the chrome-modules story (STORY-41) because a single FC UAT verifies all six modules at once; this story records the behaviour for its own modules in scope above without duplicating that criterion. An invalid `loading: lazy` CSS property was also dropped from text-block's styling during the same change (a code cleanup with no matrix-observable behaviour).
- **services-grid v1→v2 upgrade (REQ-44):** during reconciliation of bundle-30021526 this story's services-grid coverage was upgraded in place from the v1 text-only contract to v2: a new `one-col` variant, item fields renamed (`icon`→`image`, now asset-ref-only with no string fallback; `title`→`heading`), a new section-level `imageStyle` dial (icon/cover/thumb), and item-count bounds lowered from 2..6 to 1..6; the starter site (`sites/1stcontact/site.json`) was migrated to the v2 contract. The convert-flow LLM-context doc bullet for services-grid landed via a parallel-session sweep (not in the implementation commit but present at HEAD); its canonical owner is REQ-44.
- **SSR string-renderer image-style class divergence (REQ-44, code defect, not an AC):** the Astro module (`index.astro`, the canonical and UAT-tested render path) emits the image-style class as `fc-services-grid--image-<style>`, matching the `imageStyle` CSS. The standalone SSR string renderer (`render/browser.ts`) derives the dial class through a generic kebab-casing helper, producing `fc-services-grid--image-style-<style>`, which does NOT match that renderer's own `fc-services-grid--image-<style>` image-style CSS — so on the SSR string-render path the `imageStyle` sizing rules do not apply. This is an implementation defect owned by REQ-44, recorded here rather than encoded as an acceptance criterion; the matrix AC documents the single intended image-style-class behaviour proven by the module UAT.

## Dependencies

- Depends on the framework module catalog (chrome modules) story — contract, registry, and content validator are introduced there.
- Unblocks the Static Site Generator story (consumes all catalog modules) and the Lead Capture Pipeline story (replaces the contact-form's stub action with a real handler and wires Turnstile).

## Story Points

3