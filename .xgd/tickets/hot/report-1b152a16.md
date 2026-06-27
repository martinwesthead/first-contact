---
uid: report-1b152a16
id: REPORT-636
type: report
title: 'Code Review: bundle-bbb1bd9c (BUNDLE-3)'
created_by: xgd
created_at: '2026-06-27T02:10:17.684880+00:00'
updated_at: '2026-06-27T02:10:17.684880+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-bbb1bd9c
  anchor_uid: bundle-bbb1bd9c
---

# Code Review

**Result**: PASS

## Summary
Free-coded bundle BUNDLE-3 (REQ-9 Operator API, REQ-20 web-fetch safety + R2 assets, REQ-13 chat visibility/markdown/ChatCard, REQ-21 Reference Digest extractor). The implementation is sound: all new code compiles, every new handler/component is wired into its entry point, and 76 UATs pass. SSRF protection, markdown sanitization, and plan-tier authorization are correctly implemented. PASS with warnings — none block reconciliation; the noted issues are either pre-existing pipeline infrastructure or consistent with this bundle's documented stub-auth / deferred-escalation scope.

## Quality Gates
- **Tests**: PASS — 76 passed / 0 failed / 0 skipped (vitest, real 17.3s run; REPORT-633 / report-d21cb46a). Genuine evidence.
- **Build**: Reported success but the pipeline gate is a NO-OP — the xgd `tsc` plugin requires a root `tsconfig.json` (`javascript.py:202`) which this repo does not have (only `tsconfig.base.json`), so tsc never ran (0.0s). **I independently ran `pnpm -r build`** → all 9 workspace packages (extractor, web-fetch-safety, builder-ui, control-app, …) compile clean. Build is genuinely green, just not via the pipeline.
- **Lint**: Reported success (0/0) but eslint is not installed locally (`node_modules/.bin/eslint` absent) and there is no eslint config, so the gate is vacuous (0.15ms). No real lint evidence.
- **Coverage**: n/a in report (suite ran a task-filtered set).

## External Interface Accessibility
New entry points wired in: **YES**.
- `apps/control-app/src/index.ts` routes `/api/chat`, `/api/_safety/health`, assets routes, `/api/operator/events` (SSE), and `/api/operator/<action>` to the new handlers; unknown operator action → 404.
- `packages/builder-ui/src/main.ts` registers chat-panel, digest-report, chat-driver; `index.ts` re-exports chat-card, tool-result-renderers, digest-report.
- One unconsumed primitive: `web-fetch-safety/browser-budget.ts` is exported + UAT-tested but has no production caller (browser-rendering escalation is deferred to REQ-22; `escalate.ts` returns false). Acceptable as a forward-looking contract primitive.

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| `packages/web-fetch-safety/src/validate-target.ts` | SSRF protection comprehensive & correct: private/loopback/link-local/ULA/metadata IPs, IPv6, octal/hex encodings rejected; DNS-rebinding handled via per-hop redirect re-validation; MAX_REDIRECTS=5 | (positive) |
| `packages/builder-ui/src/components/chat-panel.ts:54` | Markdown sanitized with DOMPurify before innerHTML — XSS path closed | (positive) |
| `apps/control-app/src/operator/router.ts` | Plan-tier authorization (`tierPermits`) enforced before action dispatch | (positive) |
| `apps/control-app/src/assets/routes.ts` | No authorization and no account_id/site_id namespacing (flat R2 keyspace). Path traversal IS guarded (`decodeKey` rejects `..`/leading `/`). Consistent with bundle's stub-auth scope; no AC requires scoping here | WARNING |
| `apps/control-app/src/safety/health.ts` | `/api/_safety/health` returns rate-limit state for any `x-account-id` header (info disclosure / enumeration). Diagnostic endpoint; gate or remove before production | WARNING |
| `packages/builder-ui/src/chat-driver.ts:76`, `apps/control-app/src/chat.ts` (~184) | `resp.json()` parsed outside try/catch — malformed upstream Anthropic response → unhandled 500. Robustness | WARNING |
| `packages/web-fetch-safety/src/browser-budget.ts` | Exported + tested but no production caller (escalation deferred to REQ-22) | WARNING |
| `packages/extractor/src/parse-palette.ts:5-6` | `BG_SELECTORS` and `BODY_TEXT_SELECTORS` are identical Sets — dedupe or comment | NIT |
| `packages/extractor/src/parse-imagery.ts:167-169` | Inventory counts via 3 separate filter passes (O(3n)); accumulate in one pass | NIT |

No leftover debug code, commented-out blocks, TODO/FIXME stubs, or `debugger` statements (the one `console.log` in `chat.ts:98` is a legitimate injectable-logger default).

## Checklist Compliance
No architecture / security / design checklist reports exist in this project — sections skipped per prompt.

## Smoke Test
Entry points exercised via the 76 passing UATs (operator dispatch namespace, SSE event format, assets CRUD, web-fetch safety, analyze_page end-to-end, chat markdown render) plus a clean `pnpm -r build`. No stack traces. `wrangler dev` not run (Miniflare/local bindings); UAT + build coverage is sufficient.

## Issues Found
**Critical (must fix)**: none.

**Warnings (should fix)**:
- Quality pipeline lint+build gates are no-ops (no root `tsconfig.json`; eslint not installed). "build/lint success" in quality reports is not real evidence — a future broken commit could pass. Recommend: add a root `tsconfig.json` (or point the xgd build at `pnpm -r build`) and install/configure eslint. This is an XGD pipeline/project-infra gap, pre-existing, not introduced by this bundle.
- `assets/routes.ts`: add account/site scoping + auth when magic-link auth lands (architecture policy: tenant IDs on all customer records).
- `safety/health.ts`: gate the rate-limit-state disclosure before production.
- Wrap upstream `resp.json()` parsing in try/catch (chat-driver.ts, chat.ts).
- `wrangler.toml` uses literal `placeholder_*` IDs in `[env.production]` — must be replaced with real KV/R2 IDs before any production deploy.

## Fix-It Prompt
N/A — result is PASS. Warnings are tracked here for follow-up REQs (auth/multi-tenancy, REQ-22 escalation) and a pipeline-infra fix (real lint/build gates); none require the code fix loop.
