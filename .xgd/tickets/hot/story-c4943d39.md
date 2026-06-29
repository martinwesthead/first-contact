---
uid: story-c4943d39
id: STORY-64
type: story
title: split-section content module (image + text)
created_by: xgd
created_at: '2026-06-29T23:12:36.619945+00:00'
updated_at: '2026-06-29T23:17:55.175166+00:00'
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
**As a** site operator building a small-business website, **I want** a two-column "split section" module that places an image beside a heading and descriptive copy, **so that** I can present a photo alongside supporting text — one of the most common section layouts on small-business sites — without custom code.

## Description
Adds the `split-section` content module (version 1) to the framework module catalog. It renders a media column (single image) and a content column (optional eyebrow, required heading, required markdown body, optional call-to-action) side by side.

In scope:
- Two layout variants — `image-left` and `image-right` — selecting which side the image occupies on desktop. Both variants emit the image first in DOM order; the visual flip for `image-right` is achieved via CSS ordering on desktop, so mobile always stacks image-first.
- Configuration dials: `size` (sm/md/lg, default md), `surface` (default/subtle/inverse/accent, default default), `spacingTop` and `spacingBottom` (0,1,2,3,4,6,8,12,16,24, default 12 each), and `imageRatio` (square/portrait/landscape, default landscape).
- Content schema with required `image`, `heading`, and `body`, and optional `eyebrow` and `cta` ({label, href}); schema validation enforces required fields and well-formed cta.

Out of scope: multi-image media, carousels, and any behavior owned by other catalog modules. Cross-cutting markdown-body image sizing constraints are documented separately (plan item 6).

## Technical Context
Part of the Framework Module Catalog capability (CAP-34), alongside the existing chrome modules (header/hero/footer) and content modules (text-block/services-grid/contact-form/image-gallery). The module is registered in the catalog registry and exported from the framework package, matching the operator's declared module identity in REQ-39. Code state agrees with intent: the module resolves via the catalog, both variants are declared, and the required-field validation matches the documented content schema. The markdown body is rendered as pre-sanitized HTML; inline-image scoping within that body is owned by the catalog-wide image-sizing upgrade (plan item 6), not this story.

## Dependencies
None.

## Story Points
2