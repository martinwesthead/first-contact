---
uid: report-6ab46368
id: REPORT-868
type: report
title: 'Reconcile resolve conflicts: reconcile-BUNDLE-9'
created_by: xgd
created_at: '2026-06-30T03:51:21.437737+00:00'
updated_at: '2026-06-30T03:51:21.437737+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: reconcile-BUNDLE-9
---

Incoming commit: 3847ff00 — refactor(arch): rename npm scope @1stcontact → @gendev + seed productization packages (REQ-50) [FREE-CODED]

## Files resolved

- packages/builder-ui/src/spa.ts — UU (code). Per-file rule: intent unknown,
  take more recent by timestamp. Ours (2026-06-28, AC586 bootFromQuery refactor)
  is newer than incoming (2026-06-22) → took ours. Incoming's scoped import
  (`@gendev/site-schema` + `bootBuilder`) was obsoleted by ours' `bootFromQuery`
  rewrite that removed that import entirely; incoming's rename intent is satisfied
  vacuously (no @1stcontact/ remains). Flagged for post-merge review per rule.
- packages/framework/src/render/markdown.ts — UU (code). Ours (2026-06-29,
  METAS_BY_ID single-source refactor) newer than incoming → took ours' structure,
  then applied incoming's rename so the import reads `@gendev/site-schema`. Both
  intents integrated (ours' newer meta architecture + incoming's scope rename).
- tests/test_UAT_AC481_viewport_presets_resize_iframe.test.ts — UU (UAT, rename
  conflict FC→AC). Ours (2026-06-24 reconciled AC name) newer → kept ours' AC path
  and content, applied incoming's rename → import reads `@gendev/builder-ui`. No
  test function lost (same test, AC-renamed by an earlier reconcile).
- tests/test_UAT_FC_REQ-8_chat_endpoint_invokes_anthropic.test.ts — DU (deleted by
  us). Ours deleted it as part of a legitimate reconcile refactor (FC→AC); the AC
  variants AC486/AC487 exist. Incoming only scope-renamed it → modification now
  obsolete. Resolved with `git rm`. Incoming rename intent preserved in the AC
  variants (now `@gendev/`).
- tests/test_UAT_FC_REQ-8_restore_rail_left_of_preview.test.ts — DU (deleted by us).
  Same: superseded by AC479. `git rm`. Rename intent preserved in AC479 (`@gendev/`).

## Rename completion (incoming commit's own UAT contract)

REQ-50's UAT test_UAT_FC_REQ-50_scope_rename_complete asserts ZERO `@1stcontact/`
refs survive in tracked source (excluding tickets, lockfile, build artifacts, and
the REQ-50 test files). Because HEAD had diverged (FC→AC renames, METAS_BY_ID /
bootFromQuery refactors), the literal cherry-pick diff only partially landed,
leaving 102 in-scope files still on `@1stcontact/`. Completed the
`@1stcontact/` → `@gendev/` rename across the exact UAT grep scope
(packages apps tools tests sites docs package.json) so the incoming commit's
own contract holds. This reproduces THIS commit's effect, not a later commit's.

## Incoming changes preserved (STEP 3 verification)

- Zero `@1stcontact/` refs remain in the UAT grep scope (REQ-50 UAT grep: PASS).
- markdown.ts → `@gendev/site-schema`; AC481 test → `@gendev/builder-ui` (confirmed).
- spa.ts: no scoped import remains (ours' bootFromQuery refactor; rename intent met).
- Four new @gendev skeletons present (api-contracts, auth, billing, portal-ui);
  packages/ui-kit removed — matches test_UAT_FC_REQ-50_package_skeletons_present.
- Deleted FC REQ-8 tests' rename intent preserved in @gendev AC variants
  (AC479, AC486, AC487).

## State

Tree clean, no conflict markers, no unmerged paths. HEAD = 019efe1b (the
cherry-picked REQ-50 commit). No cherry-pick paused.
