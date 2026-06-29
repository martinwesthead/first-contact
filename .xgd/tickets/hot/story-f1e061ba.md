---
uid: story-f1e061ba
id: STORY-42
type: story
title: 'Framework module catalog: content modules (text-block, services-grid, contact-form)
  with progressive-enhancement form and validator extensions'
created_by: xgd
created_at: '2026-06-25T01:11:07.589587+00:00'
updated_at: '2026-06-29T22:35:03.487965+00:00'
completed_at: null
last_field_updated: status
status: updated
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-3630a42c
  story_kind: upgrade
  story_points: 3
  uat_coverage: pass
---

## Story

**As a** site author or generator/preview consumer,
**I want** content modules — text-block, services-grid, contact-form, and image-gallery — that conform to the framework's module contract and make up the framework catalog,
**so that** any site can render long-form prose, a services overview, a progressively-enhanced lead-capture form, and a photo gallery from structured content with predictable variants, dials, validation, and a no-JS fallback.

## Description

This story covers the framework catalog's content modules and the content-shape kinds they introduce. Together with the chrome modules (header, hero, footer) they form the module surface used by the marketing site and the builder preview.

In scope:

- **text-block** — two variants. `prose` constrains content to the narrow container (intended for articles, founder notes, terms). `landing` uses the default container (intended for marketing manifestos). Renders markdown body content including at least headings, lists, links, images, blockquotes, and code blocks. The heading element is omitted when no heading is supplied. Dials: `size` (sm/md/lg), `textAlign` (left/center), `spacingTop`, `spacingBottom`, `surface`.
- **services-grid** — two variants. `three-col` and `two-col` both render their target column count at and above the `md` breakpoint and collapse to a single column below. Each item is an object with optional icon (asset ref or string), required title, required markdown body, and optional CTA `{label, href}`. Item count is validated 2..6. Dials: `gap` (tight/normal/loose), `spacingTop`, `spacingBottom`, `surface`.
- **contact-form** — one variant (`inline`). Renders one labeled input per configured field with the field's type (text/email/tel/textarea), name, label, and required attribute. The form targets the configured `action` URL. A hidden honeypot field is visually concealed. A Turnstile mount-target element is present so the actual widget (wired in the lead-capture story) can attach without further markup changes. Without JS the form submits via standard HTML POST to the action URL. With JS, the form's submit is intercepted, the data is posted as a JSON request body, the form is replaced with the configured `successMessage` (or a default thank-you when not supplied) on a 2xx response, and an inline error is surfaced on a non-2xx response without navigating. Dials: `align` (left/center), `spacingTop`, `spacingBottom`, `surface`.
- **image-gallery** (`image-gallery@v1`) — two variants. `grid` lays tiles out in a CSS grid with each image locked to a 1:1 aspect ratio (`object-fit: cover`); `masonry` uses a pure-CSS `column-count` layout (no JS hydration) that lets natural image aspect ratios flow. The section is tagged `data-module="image-gallery"` and `data-variant="<variant>"`. An optional `heading` renders only when supplied; each item carries a required `image` (asset ref) rendered as a plain `<img>` with `loading="lazy"` and `decoding="async"` (no lightbox), plus an optional `caption` rendered as muted text below the image only when provided. `items[]` is validated 2..24. Dials: `columns` (2/3/4, default 3, emitted as a `--cols-N` modifier class), `gap` (tight/normal/loose), `spacingTop`, `spacingBottom`, `surface` (default/subtle/inverse/accent). Below the `md` breakpoint the gallery collapses to a single column; the per-`columns` layout applies at and above `md`.
- **Content validator extensions** — the framework's content validator accepts the new shape kinds introduced by these modules: `list-of` (with optional `min`/`max`), nested `object`, and `enum`, in addition to primitive types. image-gallery's `items[]` reuses this `list-of` of nested `object` shape with `min: 2, max: 24`.
- **Registry coverage** — the framework module registry resolves all catalog modules (header, hero, footer, text-block, services-grid, contact-form, image-gallery) at their declared versions.

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

## Dependencies

- Depends on the framework module catalog (chrome modules) story — contract, registry, and content validator are introduced there.
- Unblocks the Static Site Generator story (consumes all catalog modules) and the Lead Capture Pipeline story (replaces the contact-form's stub action with a real handler and wires Turnstile).

## Story Points

3