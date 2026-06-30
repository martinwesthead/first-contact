---
uid: report-0bf1f6d3
id: REPORT-835
type: report
title: Claude fix_review_free_coded report
created_by: xgd
created_at: '2026-06-30T00:32:16.468181+00:00'
updated_at: '2026-06-30T00:32:16.468181+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_review_free_coded
  subject_uid: bundle-d3d73016
---

The fixes are complete and verified. I've left the changes in the working tree for the reconcile workflow to run its quality gate and re-review (per mission: this is a headless `fix_review_free_coded` sub-process — no version bump, ticket transitions, or quality-gate runs on my part).

## Summary

The code review's **CRITICAL** finding was that `split-section.body` and `testimonials.items[].quote` (both declared `markdown`) were never baked to HTML at static-generation time, because both modules were missing from `METAS_BY_ID` in `render/markdown.ts`. The **WARNING** root cause was multiple hand-synced module-list source-of-truths that drift independently.

I fixed both by collapsing them to a single source of truth.

### Issues fixed

1. **CRITICAL — markdown fields not baked** (`packages/framework/src/render/markdown.ts:1-15`): Deleted the local hand-maintained `METAS_BY_ID` (which omitted `split-section` and `testimonials`) and now import it from `../modules/meta.js`. The bake path now covers every module automatically.

2. **WARNING — duplicate source of truth** (`packages/framework/src/modules/meta.ts`): Made the browser-safe `meta.ts` the **single authoritative metas list**. It now exports a complete `ALL_METAS` array (it was also missing `split-section`/`image-gallery`) and derives `METAS_BY_ID` from it. This is safe per AC-424's static guard — `meta.ts` still imports no `.astro`/server-only modules (verified passing).

3. **WARNING — registry drift** (`packages/framework/src/modules/registry.ts:31-73`): Refactored `REGISTRY` to be built from `ALL_METAS` paired with a single `COMPONENTS_BY_ID` map, with a load-time guard that throws if a meta has no component or a component has no meta. A module can no longer be registered in one map and forgotten in another.

4. **Evidence-gap hardening** (`tests/test_UAT_AC743_*`, `tests/test_UAT_AC754_*`): The existing UATs only proved `set:html` passthrough by passing pre-rendered HTML. Added bake-path assertions that pass *raw markdown* through `bakeModuleContentForRender` and assert it becomes `<strong>…</strong>` (not literal `**…**`). I extended the existing AC tests rather than creating new files, to avoid inventing AC numbers (matrix mutation is out of scope here) or leaving `test_UAT_FC_*` orphans.

### Verification
- 13 targeted tests pass (registry refactor, AC-424 browser-safe graph guard, banner/split-section/testimonials bake paths).
- Full suite: only 5 pre-existing files fail — confirmed identical failures on the stashed baseline (SSE parse errors and conversion-draft tests needing services; the review report itself recorded the suite as exit-0 in the proper reconcile environment). **Zero new failures.**

### Confidence
**High.** The CRITICAL defect is directly resolved (the bake now processes both modules, proven by the new assertions), the structural cause that let it happen is eliminated, and no behavior changed for existing modules.

One environmental note for the workflow operator: this worktree needed `pnpm install --offline` to relink the `@1stcontact/*` workspace packages before vitest could resolve them — a known reconcile-worktree symlink issue.
