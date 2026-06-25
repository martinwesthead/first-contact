---
uid: request-e220320e
id: REQ-42
type: request
title: Module:banner@v1
created_by: xgd
created_at: '2026-06-20T21:13:40.699509+00:00'
updated_at: '2026-06-25T19:41:57.393018+00:00'
completed_at: null
last_field_updated: commits
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - c17574475fcf37288855a13b945afa886c1a7237
  - e505d92c94c5ac0bdb89a76a5377d542583c8714
  version: 0.0.22
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


## Attribution note

Concurrent free-coding sessions across REQ-39/40/41/42/43 caused interleaving file writes. The banner module source files (`packages/framework/src/modules/banner/{meta.ts,index.astro}`) and the three REQ-42 UAT tests landed in commit `499b074` alongside REQ-39's split-section version bump. That SHA is attributed to REQ-39 in the ticket index.

REQ-42's own commits:
- `4737cc2` — registry.ts + index.ts entries for banner (the wiring required for `getModule("banner", 1)` to resolve)
- `e505d92` — version bump 0.0.21 → 0.0.22

All 8 REQ-42 UATs (`test_UAT_FC_REQ-42_*`) pass after the registration commit.

The cross-ticket attribution should be smoothed by reconcile; the banner-scoped facts (REGISTRY entry, version bump) are cleanly on this ticket.