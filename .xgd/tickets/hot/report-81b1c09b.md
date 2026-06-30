---
uid: report-81b1c09b
id: REPORT-866
type: report
title: 'Reconcile resolve conflicts: reconcile-BUNDLE-9'
created_by: xgd
created_at: '2026-06-30T03:32:06.920904+00:00'
updated_at: '2026-06-30T03:32:06.920904+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: reconcile-BUNDLE-9
---

## Files resolved

- `tests/test_UAT_FC_REQ-8_chat_endpoint_invokes_anthropic.test.ts` — **DU (modify/delete)**.
  HEAD (ours) deleted this file as part of a legitimate prior reconcile refactor
  ("fix(builder-ui): AC585/AC586 … remove FC duplicates"), which renamed the REQ-8
  FC test to its acceptance-criterion successor
  `tests/test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts` (tracked in HEAD).
  The incoming commit (REQ-24, 85705dd2) modified the now-deleted FC path to migrate
  it to the new `sessionId`/`userMessage` request shape. Restoring the FC file would
  recreate a duplicate of AC486, violating the FC-orphan / no-duplicate invariant.
  Per STEP 2a (deletion = legitimate refactor, incoming modification to this path now
  obsolete): resolved with `git rm`.

## Incoming changes preserved

All substantive incoming (REQ-24, free_coded) changes are present and staged:

- `apps/control-app/src/chat-db.ts` (new, 521 lines) — staged.
- `apps/control-app/src/chat-routes.ts` (new, 288 lines) — staged.
- `apps/control-app/src/chat.ts` (+407) — staged; verified the `history`-removal /
  `sessionId`+`userMessage` refactor is present (400 rejection of `history`, session
  load, tail-prime, memory tools).
- `apps/control-app/src/index.ts`, `apps/control-app/wrangler.toml` — staged.
- 7 new REQ-24 UATs (`_helpers_REQ-24_chat.ts`, attachment_sweep, first_turn_title,
  no_history_in_body, reference_doc_tools, search_per_site_scope, session_lifecycle,
  tail_prime) — staged.
- Migrated legacy chat tests (REQ-13 ×3, REQ-21, REQ-30 ×3, REQ-38, REQ-9) — staged.

The only incoming change intentionally dropped is the modification to the REQ-8 FC
test path itself — correct, since its content lives on as AC486.

## Flagged for post-merge review

- `tests/test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts` still uses the old
  `history` request shape (lines 77, 185). REQ-24 removes `history` from
  `ChatRequestBody` and now returns 400 if present, so AC486 will fail until a later
  reconcile phase (story cycle / test_fix) migrates it to the `sessionId`/`userMessage`
  shape — that is reconciliation's responsibility, not mechanical conflict resolution.

## State for finalize step

Tree staged, zero unmerged paths, cherry-pick of 85705dd2 left **paused**
(CHERRY_PICK_HEAD present) for `cherry_pick_finalize_resolution`. No
`git cherry-pick --continue/--skip` was run by this step.
