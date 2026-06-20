---
uid: request-11e05ad8
id: REQ-48
type: request
title: Text/Background Color Safety
created_by: xgd
created_at: '2026-06-20T22:50:45.359513+00:00'
updated_at: '2026-06-20T23:04:20.737653+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

**Type:** Framework + Instructions

## Problem
Transcribed theme tokens can produce unreadable text/background combinations (e.g. light text on light surface) because the per-surface foreground/background assignment is fixed by CSS but the palette tokens are operator/AI input.

## Framework fix
Add a WCAG-AA contrast utility to `@1stcontact/framework` and call it from `generateThemeCss`. For each module-surface pair the renderer applies — `default` (bg ↔ text), `subtle` (surfaceSubtle ↔ text), `inverse` (surfaceInverse ↔ bg), `accent` (accent ↔ bg) — compute the WCAG relative-luminance contrast ratio. Threshold: WCAG AA — 4.5:1 for normal text, 3:1 for large text (large = ≥24px or ≥18.66px bold; hero/h1 headings).

Enforcement is **warn-only**: failing pairs do NOT block render. Each failure produces a `/* fc-contrast-warning: <surface> ... */` comment prepended to the generated stylesheet, and (when running in Node) a single `console.warn` line. Site renders the operator's palette as-is.

## Instructions fix
Update `docs/llm-context/reproducing-a-website.md` so that after step 3.1 (apply theme tokens) the AI verifies WCAG AA contrast for each of the four surface pairs above. When a pair fails, the AI re-issues `set_theme_token` to swap the foreground/background mapping or substitute a default-palette colour. Pairs and threshold are documented inline so the AI does the check without a new tool.

## Why this is free-coded
Narrowly scoped: one utility module, one CSS-emit hook, one doc section. No new public tool surface; no schema migration.

## Test plan
UATs under `tests/test_UAT_FC_REQ-48_*.test.ts`:
  - WCAG relative-luminance + ratio maths against known fixtures (black/white = 21:1, mid-grey pair below 4.5).
  - `evaluateSurfaceContrast` returns one entry per surface pair with `pass`/`ratio`/`threshold`.
  - `generateThemeCss` emits no `fc-contrast-warning` comments for the default palette.
  - `generateThemeCss` emits a `fc-contrast-warning` comment naming the offending surface when the palette pushes a pair below threshold.
  - `generateThemeCss` still emits valid `:root` block alongside warnings (warnings do not replace output).