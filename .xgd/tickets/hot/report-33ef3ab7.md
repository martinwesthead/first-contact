---
uid: report-33ef3ab7
id: REPORT-894
type: report
title: 'Code Review: bundle-44f53d53 (BUNDLE-9)'
created_by: xgd
created_at: '2026-06-30T05:58:32.119524+00:00'
updated_at: '2026-06-30T05:58:32.119524+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-44f53d53
  anchor_uid: bundle-44f53d53
---

# Code Review

**Result**: PASS

## Summary
BUNDLE-9 (REQ-23 schema + REQ-24 chat API/handler + REQ-25 builder UI + REQ-50 @gendev rename + BUG-8 fetch binding) meets code-quality and architectural standards. The full vitest suite passes (1053/1053 across 481 files — verified directly, not via the masked 0-test quality report), all delivered capabilities are wired and reachable, the scope rename is complete with zero surviving `@1stcontact/` specifiers, and SQL/FTS/security handling is sound. The only material findings are two non-blocking Warnings centred on a leftover orphaned `bootFromQuery` function; neither causes runtime harm nor fails a quality gate.

## Quality Gates
- **Lint**: PASS (0 errors, 0 warnings).
- **Tests**: PASS — full `npx vitest run`: **481 files / 1053 tests passed**, 0 failed, 32s. (Note: the FSM quality report `report-0b531ad1` recorded `total:0` tests due to the changed-only test-gate masking; I ran the complete suite to obtain real evidence.)
- **Build**: `apps/public-site` builds clean (verified: `fc-generate` runs, emits pages+assets). `apps/control-app` `tsc --noEmit` FAILS with DOM-type errors (`HTMLElement`/`Document`/`IntersectionObserver`/`Storage`/`crypto`) in imported builder-ui sources. **This is pre-existing baseline state, not introduced by the bundle**: `main` produces the same failure (18 `tsc` errors, verified via a temp worktree build); `apps/control-app/tsconfig.json` and the build script are byte-identical to `main` (empty diff); the root cause is control-app's `types:["@cloudflare/workers-types"]` (no DOM lib) type-checking DOM-using builder-ui imports. It is documented in the reconciliation review and encoded in passing **AC-821**, which asserts public-site builds clean while control-app's pre-existing failure persists. Build gate state is unchanged (red→red), so not a regression.

## External Interface Accessibility
New entry points wired in: **yes**.
- `/api/chat/*` session routes: `matchChatRoute`/`handleChatRoute` imported and dispatched in `apps/control-app/src/index.ts` before the asset fallthrough — reachable.
- `/api/chat`: `handleChatRequest` wired in `index.ts` — reachable.
- builder-ui: `ChatsApi` + types exported from `packages/builder-ui/src/index.ts`; consumed by `store.ts`/`main.ts`/`chat-driver.ts`. Production SPA entry `spa.ts` boots via `bootBuilder` with per-site `siteId` — reachable and exercised by passing UATs.
- REQ-50 skeletons (`api-contracts`, `auth`, `billing`, `portal-ui`): package.json `main`/`exports` point to existing `src/index.ts`; intentionally orphaned per ticket. `packages/ui-kit` fully removed.
- **Gap**: `bootFromQuery` (`main.ts:365`, exported `index.ts:92`) is referenced only by its UAT (`test_UAT_AC586`); the real SPA entry `spa.ts` was rewritten to inline boot and no longer calls it (see Warnings).

## Code Quality
| File | Finding | Severity |
|------|---------|----------|
| packages/builder-ui/src/main.ts:368 | `bootFromQuery` defaults fetch to bare `globalThis.fetch` (unbound), re-introducing the exact unbound-fetch TypeError class BUG-8 fixes; inconsistent with the three bound sites (main.ts:161, chat-driver.ts:97, chats-api.ts:42) | Warning |
| packages/builder-ui/src/main.ts:365 + spa.ts:18-32 | `bootFromQuery` is now an orphaned, **divergent** duplicate of `spa.ts`'s inlined boot: it does not forward `siteId`, so any caller boots with `siteId="default"` and loses per-site chat isolation. Dead in production (test-only reference). Should be deleted or reconciled into the single `spa.ts` path | Warning |
| packages/builder-ui/src/main.ts:308-315 | digest-convert `driveTurn` calls `runChatTurn` without forwarding `fetch: fetchImpl` (ignores test-injected override; harmless in-browser) | Minor |
| packages/builder-ui/src/components/chat-panel.ts:393-396 | IntersectionObserver scroll-fallback listener not removed in `destroy()` (only `observer.disconnect()`); GC-eligible, asymmetric cleanup | Minor |
| apps/control-app/src/chat.ts + chat-routes.ts | `json`/`jsonError`/`isPlainObject` + JSON-body content-type validation duplicated across both files; a shared helper would remove duplication | Minor |
| apps/control-app/src/chat-db.ts:100,239,241 | inline magic `20`/`100` pagination bounds in `listSessions`/`searchTranscripts` while `readMessages` uses named constants — inconsistent | Minor |

No leftover debug code, commented-out blocks, or TODO stubs. `console.log` at `chat.ts:195` is a deliberate default logger.

## SQL / Security
- FTS5 external-content triggers (AI/AD/AU) in migrations 0007/0008 follow the canonical delete-then-insert pattern; `searchTranscripts` JOIN on `content_rowid='rowid'` is correct.
- FKs `ON DELETE CASCADE` correct; `UNIQUE(session_id, ord)` with `MAX(ord)+1` append prevents silent corruption (racing inserts fail rather than duplicate — acceptable under D1).
- All queries parameterized via `.bind()`; **FTS injection sanitized** (`searchTranscripts` strips FTS5 operators and quotes tokens as literals before a bound `MATCH`).
- Cross-tenant safety: `readSessionRange` verifies `owner.site_id === siteId` → 404 otherwise, preventing cross-site transcript reads via the memory tool.
- Down-migrations: project is forward-only by convention (no `.down.sql` for 0001-0008); absence is consistent, not a defect.

## Smoke Test
Entry points exercised:
- `apps/public-site` build invoked directly (`fc-generate`) — runs clean, emits 1 page + 1 asset.
- New Worker entry points (`handleChatRoute`, `handleChatRequest`) and UI boot (`bootBuilder`/`spa`) are driven by passing UATs against real Miniflare D1 / jsdom with only external boundaries (R2, Anthropic fetch) faked — no stack traces on basic invocation.

## Issues Found
**Critical (must fix)**:
- None.

**Warnings (should fix — recommend follow-up cleanup/upgrade ticket, not a blocking fix loop)**:
- Orphaned `bootFromQuery` (`main.ts:365`): dead in production, diverged from `spa.ts` (drops `siteId`), and uses unbound `globalThis.fetch` at line 368 (latent BUG-8-class defect). Delete it (and its AC-586 UAT, or repoint AC-586 at the live `spa.ts`/`bootBuilder` path), or fold it back into the single boot path with `siteId` + bound fetch.
- Pre-existing `apps/control-app` `tsc` build failure (DOM types missing from Workers-types tsconfig). Out of scope for this bundle but worth a standalone ticket: either add `"DOM"` to control-app's `lib`/`types` or stop type-checking builder-ui DOM sources through the Workers tsconfig.

These are documentation/hygiene items with no runtime impact; the delivered capabilities are correct, wired, tested, and secure.
