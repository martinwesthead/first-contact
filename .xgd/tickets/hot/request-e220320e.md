---
uid: request-e220320e
id: REQ-42
type: request
title: Module:banner@v1
created_by: xgd
created_at: '2026-06-20T21:13:40.699509+00:00'
updated_at: '2026-06-20T22:58:34.320389+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

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
