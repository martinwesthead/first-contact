---
uid: request-11e05ad8
id: REQ-48
type: request
title: Text/Background Color Safety
created_by: xgd
created_at: '2026-06-20T22:50:45.359513+00:00'
updated_at: '2026-06-25T18:45:24.217111+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 9a5a8485dd02dcf03f4fe0d68a80edf7330eabf4
  - 6b2c84d07214a125c538f9cc17c0ec3f5bf1e8f7
  version: 0.0.23
---

**Type:** Framework + Instructions

## Problem
Transcribed theme tokens can produce unreadable text/background combinations (e.g. light text on light surface) because the per-surface foreground/background assignment is fixed by CSS but the palette tokens are operator/AI input.

## Framework fix (implemented)
Added `contrastRatio` and `evaluateSurfaceContrast` in `packages/framework/src/tokens/contrast.ts`. Each module-surface pair is scored against WCAG AA:
  - `default` (palette.bg ↔ palette.text) — 4.5:1
  - `subtle` (palette.surfaceSubtle ↔ palette.text) — 4.5:1
  - `inverse` (palette.surfaceInverse ↔ palette.bg) — 4.5:1
  - `accent` (palette.accent ↔ palette.bg) — 3.0:1 (CTA / large-text surface)

`generateThemeCss` runs the evaluator on the merged palette and prepends a `/* fc-contrast-warning: <surface> — <fg> on <bg> = <ratio>:1 (below WCAG AA <threshold>:1) */` comment to the stylesheet for each failing pair. It also emits a single `console.warn` naming the failing surface(s). The site still renders the operator's palette as-is — warning, not auto-correct or block.

Verified end-to-end: building the bundled `1stcontact` site triggers `[1stcontact] theme contrast below WCAG AA on surface(s): accent` (the default `#f59e0b` accent on white is 2.15:1 — a genuine finding).

## Instructions fix (implemented)
`docs/llm-context/reproducing-a-website.md` now carries a section `1a` between "apply theme tokens" and "add missing pages" that documents the four surface pairs and the WCAG relative-luminance formula, instructs the AI to compute the ratio per pair and re-issue `set_theme_token` to swap or fall back to defaults when a pair fails. The inlined copy in `apps/control-app/src/llm-context.ts` is kept byte-for-byte in sync (REQ-30 drift guard).

## Why this is free-coded
Narrowly scoped: one utility module, one CSS-emit hook, one doc section. No new public tool surface; no schema migration.

## Test plan
UATs under `tests/test_UAT_FC_REQ-48_*.test.ts`:
  - `contrast_ratio_math` — WCAG relative-luminance + ratio against known fixtures (black/white = 21:1, mid-grey pair below 4.5, 3-digit hex shorthand).
  - `surface_contrast_evaluation` — one `ContrastPair` per surface with correct bg/fg mapping; body threshold 4.5 for default/subtle/inverse; flags subtle when palette pushes below threshold.
  - `theme_css_emits_contrast_warnings` — no warning on a constructed clean palette; `/* fc-contrast-warning: subtle ... */` on a failing palette; names multiple failing surfaces; warning does not replace the `:root` block; single `console.warn` per call naming the failing surfaces.

## Commits
  - `f2d9508` — doc edit to `reproducing-a-website.md` (section 1a, contrast verification step) — auto-bundled into REQ-43's logo-strip commit by xgd sync.
  - `9a5a848` — framework utility + `generateThemeCss` integration + `apps/control-app/src/llm-context.ts` drift-guard sync + REQ-48 UATs.
  - `6b2c84d` — patch version bump (0.0.22 → 0.0.23).