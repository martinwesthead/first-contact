---
uid: report-72cfd985
id: REPORT-834
type: report
title: 'Code Review: bundle-d3d73016'
created_by: xgd
created_at: '2026-06-30T00:23:26.535794+00:00'
updated_at: '2026-06-30T00:23:26.535794+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: code_review
  subject_uid: bundle-d3d73016
  anchor_uid: bundle-d3d73016
---

# Code Review

**Result**: FAIL
**Mode**: commits
**Anchor**: bundle-d3d73016 (REQ-39/40/42/43/48/47)

## Summary
The four new modules (split-section, testimonials, banner, logo-strip), the WCAG contrast utility, and the image-sizing changes are clean, well-structured, and consistent with the established BEM + design-token pattern. Standard quality gates pass. However, a **CRITICAL** correctness defect was confirmed empirically: `split-section.body` and `testimonials.items[].quote` are declared as `markdown` content fields but are **not** baked to HTML by the static generator, because both modules are missing from `METAS_BY_ID` in `packages/framework/src/render/markdown.ts`. The module UATs cannot catch this — they all pass quote/body as pre-rendered HTML.

## Quality Gates
| Gate | Status | Evidence |
|------|--------|----------|
| Lint | PASS | REPORT-832: lint success, 0 errors / 0 warnings |
| Build | PASS | `pnpm -w build` exit 0 (re-run locally) |
| Tests | PASS | Full vitest suite exit 0; reconciliation review 67 tests / 36 files pass |
| Coverage | PASS | per reconciliation quality gate |

(Note: a raw `biome check` with no project config reports formatting diffs — these are NOT the project gate and are disregarded; the XGD quality gate reports lint clean.)

## External Interface Accessibility
Component registry (`registry.ts`), `index.ts` exports, `meta.ts` re-exports, and `builder-ui/catalog.ts` are all correctly wired for the four new modules. **Gap**: the build-time markdown bake (`bakeModuleContentForRender` → `METAS_BY_ID`, used by `tools/generate/src/render.ts:113`) was updated for `banner` only. `split-section` and `testimonials` — which also declare markdown fields — were not added, so their markdown content is never converted to HTML at generation time.

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| packages/framework/src/render/markdown.ts:15-23 | `METAS_BY_ID` missing `split-section` and `testimonials`; markdown fields silently pass through raw to `set:html` | CRITICAL |
| packages/framework/src/render/markdown.ts vs modules/registry.ts | Root cause: two hand-synced module maps (`REGISTRY` and `METAS_BY_ID`) are a duplicate source of truth; banner stayed in sync, the other two did not | WARNING |
| packages/framework/src/modules/logo-strip/index.astro:198-200 vs 221-223 | Redundant `:hover` opacity rule (general rule duplicated by logos-variant-scoped rule); harmless | INFO |
| packages/framework/src/modules/text-block/index.astro:144 | Correctly removes invalid `loading: lazy` CSS property (pre-existing bug); good fix | INFO (positive) |

## Empirical Verification
A throwaway probe (created, run, removed — tree left clean) called `bakeModuleContentForRender` with a plain-markdown value `Best **experience** ever.`:
- `banner.subhead`  => `<p>Best <strong>experience</strong> ever.</p>`  (baked correctly)
- `split-section.body`  => `Best **experience** ever.`  (RAW markdown — NOT baked)
- `testimonials.items[0].quote`  => `Best **experience** ever.`  (RAW markdown — NOT baked)

Impact: any operator/AI-authored markdown in a split-section body or testimonial quote renders as literal markdown text (asterisks, `#`, `[]()`) on the published static site. Worse, an AssetRef-text (`kind:"text"`) body would remain an object and `set:html` would emit `[object Object]`. The declared `markdown` contract for two of the four new modules is broken in the generate pipeline.

## Why UATs missed it
Both quote/body UATs (e.g. `test_UAT_AC754_*`, `test_UAT_FC_REQ-40_*_quote_renders_markdown_html`) render the Astro component in isolation and pass the field as **already-rendered HTML** (`"<p>...</p>"`). They prove `set:html` passthrough only; they never exercise the markdown→HTML bake, so they cannot detect a missing `METAS_BY_ID` registration. This is an evidence-validity gap, but per reconciliation rules the fix targets production wiring, not the tests (though adding a bake-path assertion would harden the suite).

## Checklist Compliance
No architecture, security, or design checklist reports exist for this anchor — sections skipped.

## Smoke Test
New modules are framework components, not CLI/API entry points. Exercised via the full vitest suite and the empirical bake probe above.

## Issues Found
**Critical (must fix)**:
- `split-section` and `testimonials` markdown fields are not baked to HTML at static-generation time (missing from `METAS_BY_ID`).

**Warnings (should fix)**:
- Eliminate the dual module-map source of truth so this class of bug cannot recur.

## Fix-It Prompt
In `packages/framework/src/render/markdown.ts`:

1. Add the two missing meta imports near the existing ones (after the `bannerMeta` import):
   ```ts
   import { meta as splitSectionMeta } from "../modules/split-section/meta.js";
   import { meta as testimonialsMeta } from "../modules/testimonials/meta.js";
   ```
2. Register both in `METAS_BY_ID` (lines 15-23):
   ```ts
   [splitSectionMeta.id]: splitSectionMeta,
   [testimonialsMeta.id]: testimonialsMeta,
   ```
   (logo-strip has no markdown field, so it does not need an entry.)
3. Add a regression UAT that exercises the bake path (not just `set:html` passthrough): call `bakeModuleContentForRender` with a plain-markdown `split-section.body` and a `testimonials.items[].quote` and assert the output contains `<strong>...</strong>` (not raw `**...**`). Mirror the value style of the existing quote UATs but pass markdown, not HTML.
4. Strongly recommended (prevents recurrence): derive `METAS_BY_ID` from the single module registry (e.g. build it from `listRegisteredModules()` / the `REGISTRY` metas) instead of maintaining a second hand-synced map. After this, verify `bakeModuleContentForRender` returns baked HTML for split-section/testimonials and re-run the full suite.
