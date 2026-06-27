---
uid: report-903aa2a3
id: REPORT-637
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T02:11:45.335014+00:00'
updated_at: '2026-06-27T02:11:45.335014+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `apps/control-app/src/index.ts` — **UU** (both modified). Rule 2c (incoming authoritative). Incoming commit 85705dd2's *actual* delta is only the chat-routes wiring (import of `handleChatRoute`/`matchChatRoute`/`ChatRoutesEnv`, adding `ChatRoutesEnv` to the `Env` interface, and the `if (matchChatRoute(url))` route block). The `AssetsEnv`/`SafetyHealthEnv`/operator/safety routing visible on the incoming "theirs" side is *ambient context from the commit's working-branch parent*, not a change introduced by this commit — and those modules (`assets/routes`, `operator/events`, `operator/router`, `safety/health`) do not exist on this resync branch. Resolved by taking HEAD as the base and integrating exactly the incoming chat-routes delta. Flagged for post-merge review per the "intent unknown" rule.

- `tests/test_UAT_FC_REQ-13_get_site_definition_returns_current_draft.test.ts` — **DU** (deleted by us / main, modified by incoming). Rule 2a. `git rm` (deletion correct).
- `tests/test_UAT_FC_REQ-13_tool_call_returns_structured_error_result.test.ts` — **DU**. Rule 2a. `git rm`.
- `tests/test_UAT_FC_REQ-13_tool_call_returns_structured_ok_result.test.ts` — **DU**. Rule 2a. `git rm`.
- `tests/test_UAT_FC_REQ-21_end_to_end_chat_renders_digest.test.ts` — **DU**. Rule 2a. `git rm`.
- `tests/test_UAT_FC_REQ-9_tool_list_filters_by_plan_tier.test.ts` — **DU**. Rule 2a. `git rm`.

  Rationale for the five DU deletions: all five FC tests existed at the cherry-pick's base (`85705dd2^`) but are absent on `main` — they were **reconciled away** (FC orphan invariant: reconcile renames `test_UAT_FC_*` → `test_UAT_AC*` or deletes redundant ones). The incoming commit only re-migrates the now-superseded `history`→`sessionId` body shape of files main has already removed. Re-adding them via `--theirs` would resurrect FC-named orphans that reconciliation already processed, so accepting the deletion is correct.

## Incoming changes preserved

- `index.ts`: all three of the incoming commit's genuine changes confirmed present in the resolved file — `from "./chat-routes.js"` import ✓, `ChatRoutesEnv` in the `Env` interface ✓, the `matchChatRoute(url)` route block ✓. Net change vs HEAD is non-empty (9 insertions, 1 deletion), so this is not a no-op resolution. The excluded `AssetsEnv`/`SafetyHealthEnv` references are not changes from this commit and would dangle against modules absent on this branch.
- The remaining incoming files (`chat-db.ts`, `chat-routes.ts`, `chat.ts`, `wrangler.toml`, the 7 new REQ-24 UATs, `_helpers_REQ-24_chat.ts`, and the 5 migrated REQ-8/30/38 tests) applied cleanly during cherry-pick and are staged unmodified (A/M).

## Post-merge-review note (out of scope for this step)

The staged `chat.ts` imports `./operator/events.js` and `./operator/types.js`, which are absent on this resync branch (introduced by working commit `483b0b55`/`2a774df5` "feat(operator-api): /api/operator namespace + SSE event registry…", not yet present here). This pre-dates this conflict resolution — HEAD's `chat.ts` already references them — so it is a resync sequencing/completeness concern for a later step, not a conflict-marker issue. The tree is staged and ready for cherry-pick continuation per this step's contract.
