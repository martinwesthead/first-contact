---
uid: report-89e6c93b
id: REPORT-837
type: report
title: 'Code Review: bundle-d3d73016'
created_by: xgd
created_at: '2026-06-30T00:39:17.768840+00:00'
updated_at: '2026-06-30T00:39:17.768840+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-d3d73016
  anchor_uid: bundle-d3d73016
---

# Code Review

**Result**: PASS
**Mode**: commits
**Anchor**: bundle-d3d73016 (REQ-39 split-section, REQ-40 testimonials, REQ-42 banner, REQ-43 logo-strip, REQ-48 contrast, REQ-47 image-sizing)

## Summary
The bundle adds four framework modules (split-section, testimonials, banner, logo-strip), a WCAG-AA theme-contrast warning utility, and markdown/image-sizing constraints. The implementation is clean, consistent with the established BEM + design-token pattern, and well-tested. The **CRITICAL** defect from the prior review (REPORT-834) — `split-section.body` and `testimonials.items[].quote` declared `markdown` but never baked to HTML because both modules were missing from `METAS_BY_ID` — has been genuinely fixed via a single-source-of-truth refactor and hardened with bake-path UATs. The bundle's full evidence set passes. Two pre-existing, out-of-scope defects (a builder-ui build break and 6 chat/conversion test failures) were found in the repo but are NOT introduced by this bundle (verified identical at base commit 04e32e6a) and do not block it.

## Quality Gates
| Gate | Status | Evidence |
|------|--------|----------|
| Lint | PASS | Recorded quality gate: lint success, 0 errors / 0 warnings |
| Build (XGD gate) | PASS (stub) | Recorded quality gate reports build success, but the configured build command runs in 0.0s — a no-op stub (see Warning 1) |
| Tests (bundle selection) | PASS | Independently re-ran the bundle evidence set: 56 files / 120 tests pass (split-section, testimonials, banner, logo-strip, contrast, image-sizing UATs) |
| Coverage | PASS | per reconciliation quality gate |

## External Interface Accessibility
All four new modules are fully wired: `ALL_METAS` (modules/meta.ts) is now the single authoritative meta list; `registry.ts` builds the catalog by pairing `ALL_METAS` with `COMPONENTS_BY_ID` under a bidirectional load-time guard (throws if a meta has no component or a component has no meta); `index.ts` re-exports each module's component + meta; `builder-ui/src/catalog.ts` lists them. `render/markdown.ts` now derives `METAS_BY_ID` from the same `ALL_METAS`, so the markdown bake covers every module automatically with no second hand-synced list. No dead/unwired code.

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| packages/framework/src/modules/meta.ts | Single source of truth (`ALL_METAS` → derived `METAS_BY_ID`); clean, well-documented | OK |
| packages/framework/src/modules/registry.ts | Registry built from `ALL_METAS` + `COMPONENTS_BY_ID` with bidirectional load-time guard — prevents future drift | OK (improvement) |
| packages/framework/src/render/markdown.ts | Now imports `METAS_BY_ID` from meta.js; bake path covers all markdown modules | OK (fix verified) |
| packages/framework/src/tokens/contrast.ts | Correct WCAG relative-luminance + ratio math; thresholds 4.5 (body) / 3.0 (accent); handles 3/6/8-digit hex; throws on invalid | OK |
| packages/framework/src/tokens/css.ts | `generateThemeCss` prepends `fc-contrast-warning` comments + single console.warn; warning-not-block matches spec | OK |

## Resolution of Prior CRITICAL (REPORT-834)
Confirmed fixed. `render/markdown.ts:7` imports `METAS_BY_ID` from `../modules/meta.js`; `meta.ts` `ALL_METAS` includes split-section and testimonials (and image-gallery). Hardened by added bake-path assertions in `tests/test_UAT_AC743_*` and `tests/test_UAT_AC754_*` (no longer only proving `set:html` passthrough with pre-rendered HTML). Re-ran both: pass.

## Smoke Test
- Bundle UAT evidence set: 56 files / 120 tests — all pass.
- `generateThemeCss` contrast path exercised by REQ-48 UATs (pass).
- Full `pnpm -w build`: FAILS — see Warning 1 (pre-existing, not bundle-caused).

## Issues Found

**Critical (must fix)**: none attributable to this bundle.

**Warnings (should fix — pre-existing, OUT OF SCOPE for this bundle, do NOT route to the bundle fix loop)**:

1. **Repo build break in builder-ui (pre-existing).** `pnpm -w build` fails: `apps/control-app` runs `tsc --noEmit` over `packages/builder-ui/src/{main,preview,store}.ts`, which error with missing DOM-lib types (`Cannot find name 'HTMLElement' / 'Storage' / 'HTMLIFrameElement'`, `crypto` not on globalThis). Verified **identical at base commit 04e32e6a** (before any bundle commit); none of these files are in the bundle diff. The XGD quality gate did not catch this because its configured build command completes in 0.0s (no-op stub). Recommend a separate upgrade/test-infra ticket to (a) add `"lib": ["DOM"]` (or correct tsconfig) for builder-ui, and (b) wire a real build into the quality gate so this surface is actually compiled.

2. **6 pre-existing vitest failures in chat/conversion (pre-existing).** Full-suite run shows 6 failures across 5 files: `test_UAT_AC487_chat_endpoint_error_status_codes`, `test_UAT_AC585_chat_history_persists_and_restores_across_remount`, `test_UAT_AC633_single_page_conversion_draft`, `test_UAT_AC634_multi_page_conversion_draft`, `test_reconciliation_analyze_page_action` (AC605/AC606). None import any bundle-changed area (framework modules / markdown / tokens / registry / meta / catalog / llm-context); failures are in chat-endpoint status codes, chat-history persistence, SSE parsing (`Unexpected token 'e', "event: don"...`), and conversion drafts. Recommend a separate ticket against the chat/conversion subsystem.

## Verdict Rationale
The bundle's free-coded scope is fully green and architecturally sound, and the prior CRITICAL is genuinely resolved. The two warnings are pre-existing repo defects in subsystems this bundle never touches (proven at the base commit). Failing this bundle would send the capped fix loop against code outside its scope. PASS, with both pre-existing defects documented for separate tickets.
