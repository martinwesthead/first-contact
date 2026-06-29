---
uid: story-69fa1c75
id: STORY-66
type: story
title: banner@v1 content module
created_by: xgd
created_at: '2026-06-29T23:36:41.448497+00:00'
updated_at: '2026-06-29T23:36:41.448497+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-d3d73016
  capability_uid: capability-3630a42c
  story_kind: feature
  story_points: 2
---

## Story
**As a** site operator composing a page from the framework module catalog, **I want** a full-width banner module that presents a bold statement with an optional call-to-action button, **so that** I can place announcements, section dividers, and inline calls-to-action between content sections without writing custom code.

## Description
Adds the `banner` content module (version 1) to the framework module catalog: a full-width statement strip used between content sections for announcements, dividers, or calls to action. The module is selectable from the builder catalog and renders as a published section.

In scope:
- Two visual variants, `simple` and `with-cta`. The variants differ only in layout/CTA styling — the CTA button renders if and only if a `cta` content value is provided, independent of the chosen variant.
- Dials: `size` (sm/md/lg), `align` (left/center, default left), `spacingTop` and `spacingBottom` (0/1/2/3/4/6/8/12/16/24, default 6 — tighter than hero so banners nest between sections), `surface` (default/subtle/inverse/accent).
- Content fields: `eyebrow` (optional short label), `heading` (required), `subhead` (optional markdown supporting inline links/emphasis, matching the hero subhead), `cta` (optional object with required `label` and `href`).
- The module is discoverable in the framework catalog surfaced to the builder UI with its declared variants and dials.

Out of scope:
- Markdown body/image-sizing constraints on the subhead — owned by the image-sizing upgrade story (plan item 6) of this bundle.
- Any catalog modules other than `banner`.

## Technical Context
- Belongs to capability "Framework Module Catalog" (CAP-34, capability-3630a42c), alongside the chrome and content modules and the sibling new modules in this bundle (split-section, testimonials, logo-strip).
- The `banner.subhead` markdown field is registered in the render layer's markdown metadata registry so subhead content is treated as markdown (consistent with `hero.subhead`); the rendered output injects the already-processed subhead HTML.
- The module is registered and re-exported by the framework so it resolves by id/version, and is listed in the builder-ui catalog.
- Code grounding: `packages/framework/src/modules/banner/{meta.ts,index.astro}`, registry/index wiring, and `render/markdown.ts` METAS_BY_ID. Proven by `tests/test_UAT_FC_REQ-42_banner_*`. Intent (REQ-42 within bundle-d3d73016) and code agree; no divergence observed. Per the ticket attribution note, the module source landed in an interleaved commit attributed to REQ-39 while the registration wiring is on REQ-42 — this is commit-attribution noise only and has no effect on the documented capability.

## Dependencies
None.

## Story Points
2
