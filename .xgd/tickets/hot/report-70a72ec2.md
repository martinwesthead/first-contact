---
uid: report-70a72ec2
id: REPORT-618
type: report
title: Fix Builder UI (uat) — attempt 1
created_by: xgd
created_at: '2026-06-27T01:19:34.185785+00:00'
updated_at: '2026-06-27T01:19:34.185785+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: capability_report
  subject_uid: capability-6694c60f
  report_kind_detail: fix_structural_validation
  level: uat
  fixes_applied: 5
  progress_made: true
  needs_more_work: false
  violations_remaining: 0
  anchor_report_uid: report-cda4212b
  validation_report_uid: report-f792cefd
---

# Fix Summary — Builder UI (uat)

**Attempt**: 1
**Fixes applied this call**: 5 resolution actions (16 file-level mutations)
**Violations remaining**: 0
**Needs more work**: false

Both UAT-level violations (AC-585, AC-586) and the exclusivity warning are
resolved. The single remaining finding (#4) is informational (AC-482 flex-column
contract is the correct jsdom-testable equivalent) and requires no action.

## Actions Taken — by Resolution Category

| # | Category | Element | Action |
|---|---|---|---|
| 1 | code-issue | AC-585 / `packages/builder-ui/src/store.ts` | Store now persists AND restores chat-turn history. `appendChatMessage()` calls new `persistChat()`; constructor hydrates `chatHistory` from storage via new `loadPersistedChat()`. Chat history serialised under sibling key `${storageKey}_chat` so the site-definition key format (relied on by AC-485) is unchanged. |
| 2 | uat-add | AC-585 | Authored `tests/test_UAT_AC585_chat_history_persists_and_restores_across_remount.test.ts`. Drives real `runChatTurn` (one accepted `set_theme_token`, one rejected out-of-enum `set_module_dial`), asserts a serialised chat history is written to storage, re-mounts a fresh `BuilderStore` against the same storage, and asserts the chat log is restored in order incl. the rejected entry's structured error. RED on pre-fix code → GREEN after action #1. PASS. |
| 3 | code-issue (enabler) | AC-586 / `main.ts`, `spa.ts`, `index.ts` | Extracted the untested top-level boot IIFE in `spa.ts` into a testable `bootFromQuery({root, search, fetch, storage, chatEndpoint})` in `main.ts` (parses `?site=`, defaults to `1stcontact` when absent or empty, fetches `/starter-sites/<name>.json` same-origin, boots). `spa.ts` now a thin caller; `bootFromQuery` exported from `index.ts`. No behavior change — pure refactor for testability. |
| 4 | uat-add | AC-586 | Authored `tests/test_UAT_AC586_starter_fetch_via_site_param.test.ts` (3 cases): no `?site=` → fetch `/starter-sites/1stcontact.json` adopted as initial site; `?site=acme` → `/starter-sites/acme.json`; empty `?site=` → default. PASS GREEN. |
| 5 | uat-edit (consolidate) | 10× `test_UAT_FC_REQ-8_*` | Deleted the ten pre-reconciliation free-coded UAT duplicates flagged in finding #3. Each maps 1:1 to its canonical AC twin (AC-477…AC-486), all of which were re-run green, so coverage is preserved and the AC-traceable UATs are now the sole evidence. |

## Code Edits

| File | Change | Evidence chain |
|---|---|---|
| packages/builder-ui/src/store.ts | +`CHAT_KEY_SUFFIX`, `chatStorageKey`, `persistChat()`, `loadPersistedChat()`; constructor hydrates chat history; `appendChatMessage` persists | Finding #1 named `appendChatMessage` (never persisted) + `persist()` (site-only) + constructor/`bootBuilder` seeding `chatHistory:[]`. AC-585 criterion + BUNDLE-2 intent ("localStorage persistence of working site AND chat-turn history") both require persisted+restored chat. New UAT failed against pre-fix code, passes after. |
| packages/builder-ui/src/main.ts | +`bootFromQuery()` / `BootFromQueryOptions` | Finding #2 suggested extracting a testable boot entry; behavior already correct in `spa.ts`, only untestable. |
| packages/builder-ui/src/spa.ts | IIFE → `bootFromQuery` call | Same as above; thin entry. |
| packages/builder-ui/src/index.ts | export `bootFromQuery`, `BootFromQueryOptions` | Make boot path importable by the AC-586 UAT. |

## Verification

All builder UATs pass against the regression worktree source (the new AC-585 +
AC-586 cases, the 11 canonical AC UATs AC-477…AC-487, and the email/turnstile
ACs): **22/22 tests green** after the FC deletions.

**Environment note (FYI, non-blocking):** this worktree's `node_modules` is a
symlink to the shared main-project install, whose `@1stcontact/builder-ui` link
currently points at the `reconcile-BUNDLE-3` worktree (stale linkage from the
prior reconcile run), not at this regression worktree. Running `vitest` with the
default config therefore resolves the package to reconcile-BUNDLE-3 source, where
my `store.ts`/`main.ts` edits are absent and AC-585 would fail. I verified the
suite by running `vitest` with the `@1stcontact/builder-ui` specifier aliased to
this worktree's `packages/builder-ui/src` — i.e. exactly what the runner would
resolve if the shared link pointed here. I did NOT modify the shared
`node_modules` (it would affect other worktrees and is outer-workflow plumbing).
Flagging so the workflow/operator can confirm the regression runner resolves the
package to the regression worktree before relying on a default-config test run.

## needs_review Items Forwarded

None.
