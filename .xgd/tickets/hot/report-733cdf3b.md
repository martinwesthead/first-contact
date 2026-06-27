---
uid: report-733cdf3b
id: REPORT-592
type: report
title: 'Overlap resolution: cluster 4'
created_by: xgd
created_at: '2026-06-27T00:36:29.890338+00:00'
updated_at: '2026-06-27T00:36:29.890338+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: overlap_resolution
  subject_uid: report-cda4212b
  cluster_id: '4'
---

## Cluster 4 Resolution

**Boundary**: CSS generation: theme-token CSS vs generator bundle CSS
**Stories resolved**: 2

### Actions

| Story | Action | From | To | Rationale |
|-------|--------|------|-----|-----------|
| story-e53ba4cf (STORY-40) | confirm | capability-c64bb7c7 (CAP-33) | (no change) | Story scope is the token-to-CSS generator function only — `:root` block, defaults, dark-mode override, Google Fonts shortlist/URL helpers. All 8 ACs (AC-403..AC-410) sit strictly at the generator-function layer. The story body explicitly disclaims "how the generated CSS is wired into a finished page (the static generator's job)" as out of scope. Correct home is CAP-33 (Framework Theme Tokens & CSS Generation). |
| story-d111f966 (STORY-43) | confirm | capability-820fbc22 (CAP-35) | (no change) | Story scope is the build orchestration — `runGenerate` programmatic API + `fc-generate` CLI, site loading/validation, HTML rendering, asset copying, and the per-site `theme.css` bundling step. AC-447 ("Per-site theme.css concatenates theme-token CSS variables with every registered framework module's styles") is the concatenation/wiring step, not the theme-token generator itself — it consumes CAP-33's output but lives in the build pipeline. Correct home is CAP-35 (Static Site Generator). |

### Boundary Rule

- **CAP-33** owns the function: tokens → CSS variable string (one `:root` block, optional `@media (prefers-color-scheme: dark)` block, font URL helpers).
- **CAP-35** owns the build step that calls that function and concatenates its output with every registered module's CSS into a deployable per-site `theme.css` file at `/assets/theme.css`.

The two layers compose cleanly: STORY-40 produces the theme-variable CSS string; STORY-43 consumes it and writes the bundled stylesheet. No AC straddles the boundary; no test infrastructure is shared between them in a way that creates capability ambiguity. The overlap surfaced because both stories mention "CSS generation" in their descriptions, but the actual responsibilities are disjoint and the existing assignment correctly reflects that.
