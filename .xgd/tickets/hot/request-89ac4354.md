---
uid: request-89ac4354
id: REQ-47
type: request
title: Image Sizing & Controls
created_by: xgd
created_at: '2026-06-20T22:50:00.074796+00:00'
updated_at: '2026-06-20T23:20:17.297593+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 394bbfbe86a48ea271b85a3ccb45af3bea1fa5ac
  - c91aabdab780c1a5645656313ce8a534e5bdfd50
  version: 0.0.24
---

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