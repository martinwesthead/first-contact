---
uid: report-73c71d6c
id: REPORT-920
type: report
title: 'Code Review: bundle-93cd5926'
created_by: xgd
created_at: '2026-06-30T07:08:17.091186+00:00'
updated_at: '2026-06-30T07:08:17.091186+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-93cd5926
  anchor_uid: bundle-93cd5926
---

# Code Review

**Result**: PASS

## Summary
Bundle REQ-53 + REQ-51 + BUG-15 + BUG-17 implements `preview_generated_page` (the AI self-perception loop), makes `analyze_page` render-by-default (removing the escalation heuristic), inlines `/assets/` references as data: URLs for preview screenshots, and raises the browser budget defaults to effectively infinite. Implementation is clean, well-documented, fully wired, and consistent with the existing REQ-21/REQ-22 pipeline. All quality gates pass.

## Quality Gates
- **Lint**: SUCCESS (0 errors, 0 warnings) — per quality report report-c796f318.
- **Build**: SUCCESS — per quality report.
- **Tests**: PASS — the reconcile quality report shows a vacuous `javascript-vitest` run (0 passed / 0 failed, exit 1) because the suite's `test_filter` matched no files (pre-existing quality.yaml `test_dirs` misconfiguration noted in BUG-17). Reviewer ran the full suite directly: `npx vitest run` → **483 files, 1089 tests, all passing (exit 0)**. No stale-UAT regressions on the modified ACs.
- **Coverage**: Met via UAT coverage (dedicated REQ-51/BUG-15/BUG-17 UAT files all green).

## External Interface Accessibility
New entry points wired in: **yes**.
- `preview_generated_page` registered in `SYSTEM_ACTIONS` (registry.ts) with `handler: previewGeneratedPageHandler` and full `tool_spec` (pageId + compareToDigestId inputs).
- `<PreviewDigestReport>` renderer registered with the REQ-13 dispatcher via `registerPreviewDigestReport()` (kind: 'preview_digest'), called at boot in `main.ts`, re-exported from `builder-ui/src/index.ts`.
- New extractor surface (`PreviewDigest`, `PreviewSource`, `renderPreviewDigest`, `buildPreviewPrefix`, `parsePreviewDigest`, `parseReferenceDigest`) re-exported from `extractor/src/index.ts`.
- `analyze_page` tool_spec updated (forceRendered input removed; render-by-default described). No dead modules; deleted `escalate.ts` has no remaining production references (grep confirms only comments in tests/tickets).

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| apps/control-app/src/operator/preview-generated-page.ts | Clean handler; explicit degraded-path, graceful budget gate, defensive try/catch around commentary. Well-documented. | OK |
| apps/control-app/src/operator/analyze-page.ts | Escalation heuristic removed; render-by-default with static fallback. No legacy mode. | OK |
| apps/control-app/src/operator/browser-driver.ts | Static puppeteer import (bundler-visible) + single session-attach retry pattern-matched on CF's error class. | OK |
| packages/extractor/src/preview-digest.ts | Pure plumbing wrapper reusing renderedFetch/mergeComputedSignals; commentary correctly delegated to handler. | OK |
| packages/extractor/src/upload-screenshots.ts | UploadScreenshotsArgs discriminated union preserves back-compat ({chatId,turnId}) while adding {pathPrefix}. | OK |
| packages/web-fetch-safety/src/browser-budget.ts | Defaults raised to 1e9; enforcement machinery + per-call config override intact. | OK |
| preview-generated-page.ts:620-623 | Re-export comment claims builder-ui consumes buildPreviewPrefix, but the card builds `/assets/${key}` directly. Inaccurate comment only — harmless. | Info |

## Smoke Test
The new entry points are AI tool surfaces (`preview_generated_page`) and a builder-ui chat card requiring a full Worker runtime + Browser Rendering binding + a draft site definition — not bare CLI/`--help` invocable. They are exercised end-to-end by the dedicated passing UAT suites: `test_UAT_FC_REQ-51_preview_generated_page`, `test_UAT_FC_REQ-51_preview_digest_report`, `test_UAT_FC_REQ-51_tool_registered`, `test_UAT_FC_BUG-15_preview_inlines_local_assets`, `test_UAT_FC_BUG-17_browser_budget_effectively_infinite`, plus reconciliation suites. All green in the full run.

## Checklist Compliance
No architecture, security, or design checklist reports exist for this anchor — sections omitted per review instructions.

## Issues Found
**Critical (must fix)**: none.

**Warnings (should fix)**: none.

**Info (optional)**: re-export comment in `preview-generated-page.ts:620-623` slightly misstates the consumer of `buildPreviewPrefix`; cosmetic only.
