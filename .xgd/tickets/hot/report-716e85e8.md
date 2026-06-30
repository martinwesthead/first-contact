---
uid: report-716e85e8
id: REPORT-863
type: report
title: 'Code Review: bundle-30021526 (REQ-44 + REQ-46 + BUG-13 + REQ-49)'
created_by: xgd
created_at: '2026-06-30T03:26:12.803427+00:00'
updated_at: '2026-06-30T03:26:12.803427+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-30021526
  anchor_uid: bundle-30021526
---

# Code Review

**Result**: PASS

## Summary

The free-coded bundle (services-grid@v2, the dev-only `xgd_ticket` tool + localhost sidecar, external-stylesheet background discovery, and the rendered-fetch transcription upgrade) is well-structured, defensively coded, and fully integrated. Lint is clean, build succeeds, and all 73 of the bundle's own UATs pass through real interfaces. The bundle introduces **zero regressions**: the 6 suite failures present on HEAD are reproduced identically on clean `main` (389304f0) and are unrelated to this bundle's scope. Two genuine defects are documented below as warnings; neither is fixable within this bundle's fix loop (one is pre-existing on main, the other is already triaged to a regression by REPORT-862).

## Quality Gates

| Gate | Status | Evidence |
|------|--------|----------|
| Lint | PASS | REPORT-861: 0 errors, 0 warnings |
| Build | PASS | REPORT-861: success |
| Bundle UATs | PASS | 73/73 pass across 28 files (REQ-44, REQ-46, BUG-13, REQ-49), run locally |
| Coverage | PASS | preflight pass; evidence set fully green |

**Note on the regression quality report (REPORT-861):** its vitest suite shows `0 tests / exit_code 1` because the regression `test_filter` keys on `test_UAT_AC###_*` names while the bundle's evidence ships under free-coding `test_UAT_FC_*` names. This is a known AC<->test selector-linkage concern (also flagged by REPORT-862, owned by structural validation), **not** a sign the tests don't pass. I executed the bundle's UATs directly to confirm: 73/73 green.

## Full-Suite Status (independently run)

Clean run on HEAD: **6 failed | 971 passed (977)**. The 6 failures are in the chat/conversion flow, none in bundle-touched scope:
- AC-605 / AC-606 (test_reconciliation_analyze_page_action)
- AC-487 (chat_endpoint_error_status_codes)
- AC-585 (chat_history_persists_and_restores)
- AC-633 (single_page_conversion_draft)
- AC-634 (multi_page_conversion_draft)

All 6 share root cause `SyntaxError: Unexpected token 'e', "event: don"...` (an SSE `event: done` stream parsed as JSON in the test harness). **Verified pre-existing on clean `main` 389304f0** — all 6 fail identically there. None of these test files were modified by the bundle, and the bundle's `chat.ts` change (adds DEV_TOOLS_ENABLED gating + an `xgd_ticket` summarize case) cannot produce this error. Not attributable to this bundle.

## External Interface Accessibility

All new entry points are wired in:
- `xgd_ticket` registered in `SYSTEM_ACTIONS` with handler (registry.ts:606-636); gated fail-closed in `visibleToolSpecs` (registry.ts:658 — visible only when `devToolsEnabled === true`); `chat.ts:152` passes `devToolsEnabled: env.DEV_TOOLS_ENABLED === 'true'`.
- BUG-13 `extractExternalStylesheetAssets` / `mergeStylesheetAssets` wired into analyze-page.ts:121-129 and exported from extractor/index.ts:65-66.
- REQ-49 `renderedFetch` wired into transcribe-site.ts:584 with the static->rendered cache upgrade (transcribe-site.ts:508-638).
- REQ-44 services-grid@v2 resolves in registry (UAT v2_registered passes).
- Sidecar entry points present (tools/dev-tools-server/{src,bin}).

## Code Quality

| File | Finding | Severity |
|------|---------|----------|
| tools/dev-tools-server/src/handler.ts | cwd guard uses path-segment check (`startsWith(root + sep)`), not naive substring; allowlist re-checked (defence in depth); argv built explicitly, no shell pass-through. Exemplary. | None |
| apps/control-app/src/operator/xgd-ticket.ts | Fail-closed dev gate + allowlist re-check; clean ActionResult surfacing; non-2xx and `ok:false` both mapped to failed. | None |
| packages/extractor/src/external-stylesheets.ts | Proper URL dedup, `data:` filtering, url() resolved against the stylesheet URL per CSS spec; best-effort fetch; documented limitations (@import not followed). | None |
| packages/framework/src/render/browser.ts | **imageStyle dial inert on published SSR path** (see Warning 1). | Warning |

No leftover debug code, commented-out blocks, TODO stubs, duplicate logic, or magic constants found in the changed files.

## Checklist Compliance

No architecture, security, or design checklist reports exist for this anchor — sections skipped per review protocol.

## Smoke Test

Entry points exercised:
- Sidecar handler: allowlist-reject path returns 400 without spawning real xgd (UAT sidecar_refuses_command, 7 assertions, pass).
- `xgd_ticket` Workers handler: entered via real `findAction('xgd_ticket')` dispatch (UATs rejects_unknown_command / create_routes_to_sidecar, pass).
- services-grid@v2 render, transcribe_site force-rendered, analyze_page stylesheet merge: all exercised by passing UATs through real interfaces (REPORT-862 confirmed non-tautological).
No entry point stack-traced or crashed on invocation.

## Issues Found

**Critical (must fix)**: none.

**Warnings (should fix — out of this bundle's fix-loop scope):**

1. **imageStyle dial inert on the published static-render path (REQ-44).** `dialClasses` (browser.ts:283) emits `fc-services-grid--image-style-${value}` (kebab of `imageStyle`), but the SSR CSS at browser.ts:535-540 targets `.fc-services-grid--image-icon|thumb|cover` (no `-style-`). The selectors never match, so icon/thumb/cover sizing does not apply on published sites (images still render, just unsized). The Astro authoring/preview path (index.astro:41) emits the matching `fc-services-grid--image-${imageStyle}` and works correctly. This is the divergence REPORT-862 row 7 already identified and deliberately recorded as a code defect (not absorbed into an AC), flagged for regression. **Fix belongs in a follow-up upgrade/regression story, not this fix loop** — changing browser.ts now would desync the just-written reconciliation story-f1e061ba (which documents the current divergence). One-line fix when scheduled: align the CSS selectors to `--image-style-X` (or special-case the dial class), in both browser.ts and index.astro.

2. **6 pre-existing chat/conversion suite failures on `main`** (AC-487, AC-585, AC-605, AC-606, AC-633, AC-634). SSE-parsed-as-JSON harness failures verified identical on clean main 389304f0. Not introduced by this bundle and not within its scope; raised here for visibility so this PASS is not mistaken for a fully-green suite. Owned by baseline/main maintenance.

## Verdict

PASS. The bundle meets code-quality and architectural standards: clean lint/build, 73/73 evidence UATs green through real interfaces, all new surfaces correctly integrated and gated, no regressions introduced. The two documented warnings are genuine but lie outside this bundle's fix-loop responsibility (one pre-exists on main; the other is already triaged to regression with the matrix truthfully reflecting it).