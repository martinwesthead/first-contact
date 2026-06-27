---
uid: report-81e7b084
id: REPORT-635
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T02:00:41.128446+00:00'
updated_at: '2026-06-27T02:00:41.128446+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `packages/extractor/src/schema.ts` — class **DU** (ours/main-rooted side lacks the file; incoming REQ-49 `76693087` modifies it). Rule 2a applied: incoming is meaningful (adds `"font"` to `AssetKind`, new `BoundingBox` + `LayoutBoundingBoxes` zod schemas, optional `boundingBoxes` field on `LayoutSignals`), and `index.ts` exports from `./schema.js`, so the deletion is not a legitimate refactor. Resolved with `git checkout --theirs -- packages/extractor/src/schema.ts && git add` (take incoming).

All other files in the cherry-pick (`index.ts`, `merge.ts`, `rendered-fetch.ts`, `transcribe.ts`, `browser-driver.ts`, `transcribe-site.ts`, the two `_helpers_*` files, and the four `test_UAT_FC_REQ-49_*` UATs) applied without conflict and were already staged by the cherry-pick.

## Incoming changes preserved

`packages/extractor/src/schema.ts` (verified against `76693087`):
- `AssetKind = z.enum(["img", "background", "video", "font"])` — `"font"` present.
- `export const BoundingBox = z.object({...})` — present.
- `export const LayoutBoundingBoxes = z.object({ hero, nav, sections, cards })` — present.
- `boundingBoxes: LayoutBoundingBoxes.optional()` on `LayoutSignals` — present.

All incoming REQ-49 additions appear verbatim in the staged resolution.

## Post-merge review flag

The enrichment rule flagged this file for post-merge review (intent metadata absent on the ours side). Noted for the outer workflow: the resync HEAD does not yet contain the foundational REQ-21 extractor files (`dom.ts`, `extract.ts`, `parse-*.ts`, `render-markdown.ts`, `css-walk.ts`), which `index.ts` imports. That is outside this conflict-resolution scope (no conflict markers involve those paths) but will affect a later build/quality gate.
