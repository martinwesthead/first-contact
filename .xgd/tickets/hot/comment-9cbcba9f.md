---
uid: comment-9cbcba9f
id: COMMENT-204
type: comment
title: Claude response for fix_structural_validation report
created_by: xgd
created_at: '2026-06-27T01:19:56.297372+00:00'
updated_at: '2026-06-27T01:19:56.297372+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-4cc35ffd
  kind: note
---

The change set is exactly as intended — no temp files, no stray edits, and the shared `node_modules` was restored to its original state.

## Done — `fix_structural_validation` (Builder UI, level=uat), attempt 1

All findings from REPORT-613 are resolved. Completion report: **REPORT-618** (`progress_made: true`, `needs_more_work: false`, `violations_remaining: 0`).

**Violation 1 — AC-585 (chat-turn history persist/restore)** — both a coverage gap *and* a real code gap:
- `store.ts`: added `persistChat()` + `loadPersistedChat()`; `appendChatMessage()` now persists, the constructor now hydrates `chatHistory` from storage. Stored under a sibling key `..._chat` so the site-definition key format AC-485 depends on is untouched.
- Authored `test_UAT_AC585_*` driving real `runChatTurn` (accepted + rejected turns) → re-mount → restore. RED before the fix, GREEN after.

**Violation 2 — AC-586 (starter fetch via `?site=`)** — coverage-only; behavior already existed in an untestable IIFE:
- Extracted `bootFromQuery()` into `main.ts` (exported via `index.ts`), `spa.ts` reduced to a thin caller. Pure refactor, no behavior change.
- Authored `test_UAT_AC586_*` (default / named / empty `?site=`). GREEN.

**Warning — exclusivity** — deleted the 10 redundant `test_UAT_FC_REQ-8_*` duplicates; each maps 1:1 to its canonical AC twin (AC-477…AC-486), all re-run green, so coverage is preserved.

**Finding 4** — informational, no action needed.

**Verification:** 22/22 builder UATs pass against this worktree's edited source.

One thing I flagged in the report and want to surface to you directly: this worktree's `node_modules` is a symlink into the shared main-project install, whose `@1stcontact/builder-ui` link currently points at the **`reconcile-BUNDLE-3`** worktree (stale from the last reconcile), not this regression worktree. So a default `vitest` run resolves the package to the *wrong* source and AC-585 would falsely fail. I verified by aliasing the specifier to this worktree's `src` (what a correctly-linked runner would resolve) and did **not** touch the shared `node_modules`, since that's outer-workflow plumbing affecting other worktrees. Worth confirming the regression runner resolves builder-ui to the regression worktree before any default-config gate relies on it.
