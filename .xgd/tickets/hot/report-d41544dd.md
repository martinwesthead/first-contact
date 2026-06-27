---
uid: report-d41544dd
id: REPORT-623
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T01:29:05.965619+00:00'
updated_at: '2026-06-27T01:29:05.965619+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Context

Cherry-picking `be19e5f1` (REQ-36: builder-ui chat panel XGD-parity rebuild +
end-to-end SSE streaming) onto the resync branch (HEAD = main-rooted, which has
already reconciled REQ-8/9/13/21 into AC tests). 8 conflicts: 2 UU, 6 DU.

## Files resolved

- `packages/builder-ui/package.json` — **UU**. Incoming adds tiptap/marked/dompurify
  deps; HEAD had only site-schema. Incoming is a strict superset of the
  `dependencies` block (no other regions differ). Resolved to the union (incoming
  superset). Rule 2c: incoming authoritative.
- `tests/test_UAT_FC_REQ-8_chat_endpoint_invokes_anthropic.test.ts` — **UU**.
  Mutually-exclusive overlap: main's reconcile simplified this to a single-turn
  JSON test (removed `callCount`); incoming rewrote it to multi-turn SSE
  (`encodeAnthropicSSE`/`consumeChatSSE`, `text/event-stream`, restored
  `callCount`). Rule 2c (incoming wins on mutual exclusion): took theirs via
  `git checkout --theirs`. The hand-merge was not viable — main deleted the
  `let callCount`/`callCount++` lines that incoming requires, so a marker merge
  would have left `callCount` undefined.
- `tests/_helpers_REQ-13_anthropic.ts` — **DU**. Deletion legitimate (rule 2a).
  Main reconciled it away; the surviving AC chat tests import `_helpers_REQ-8_site`,
  not this helper (confirmed no remaining importers on HEAD). `git rm`.
- `tests/test_UAT_FC_REQ-13_get_site_definition_returns_current_draft.test.ts` — **DU**. `git rm` (below).
- `tests/test_UAT_FC_REQ-13_tool_call_returns_structured_error_result.test.ts` — **DU**. `git rm` (below).
- `tests/test_UAT_FC_REQ-13_tool_call_returns_structured_ok_result.test.ts` — **DU**. `git rm` (below).
- `tests/test_UAT_FC_REQ-21_end_to_end_chat_renders_digest.test.ts` — **DU**. `git rm` (below).
- `tests/test_UAT_FC_REQ-9_tool_list_filters_by_plan_tier.test.ts` — **DU**. `git rm` (below).

### Why the DU deletions are legitimate (not LLM churn)

Updated main (HEAD base) reconciled REQ-8/9/13/21 — renaming their `test_UAT_FC_*`
files to `test_UAT_AC*` and deleting the FC-named originals (FC-orphan invariant).
Confirmed on HEAD: `AC456`, `AC483`, `AC484`, `AC485`, `AC486`, `AC487` all present;
the FC files and the REQ-13 helper absent. The incoming REQ-36 modifications to
these FC files were SSE-shape adaptations of tests that no longer exist on main.
Resurrecting them (`checkout --theirs`) would reintroduce reconciled-away tests,
violate the FC-orphan invariant, and duplicate AC coverage — so deletion is
correct (`git rm`).

## Incoming changes preserved

- `package.json` — all 7 incoming deps (tiptap core/pm/starter-kit/extension-placeholder,
  dompurify, marked, tiptap-markdown) verified present in the staged blob.
- REQ-8 chat test — staged blob is byte-identical to `be19e5f1`'s version
  (`checkout --theirs`): `callCount` present, `text/event-stream` present, zero
  conflict markers.
- The substantive REQ-36 behaviour (end-to-end SSE streaming) remains covered by the
  5 newly-added `test_UAT_FC_REQ-36_*` files (staged as A) and the new
  `_helpers_REQ-36_chat_sse.ts` helper. No unique incoming coverage was lost by
  removing the DU files — their behaviour is covered by main's AC tests plus REQ-36's
  own FC-36 streaming tests.

## Staging state

`git status --porcelain` shows zero conflict-class lines (UU/DU/AA/UD/AU/UA). All
resolved paths staged as M/A; the 6 `git rm`'d FC files net-zero against HEAD (which
never had them). Cherry-pick continuation is owned by the next workflow step.
