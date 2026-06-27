---
uid: report-eafb8c24
id: REPORT-600
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T00:46:24.834875+00:00'
updated_at: '2026-06-27T00:46:24.834875+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `packages/builder-ui/src/components/chat-panel.ts` (UU, code file) — INCOMING wins per rule 2c (and per conflict-intent metadata "more recent commit by timestamp; flag for post-merge review"). HEAD held the older 2026-06-13 plain-`<textarea>` chat panel from commit `72321cf2` (feat: chat-driven SPA). Incoming `749ef9b9` (2026-06-19, free-coded REQ-32 fix) builds on the TipTap-editor chat panel and adds the `busy`/`setBusy`/`runSubmit` machinery plus the spinner+label DOM. Replaced HEAD with the incoming file verbatim — that preserves every line of the developer fix and matches the `setInputMarkdown` / `aria-busy` / `data-fc-chat-send-busy` API the seven new `tests/test_UAT_FC_REQ-32_*.ts` UATs exercise.

## Incoming changes preserved

- `let busy = false;` + `setBusy()` toggling `disabled`, `aria-busy="true"`, and `data-fc-chat-send-busy` — present at lines 174–185.
- `submit()` early-returns when busy, clears editor content, wraps `await options.onSend(text)` in try/finally to clear busy — present at lines 187–197.
- `runSubmit()` swallows rejected `submit()` to avoid unhandled promise rejection — present at lines 200–207.
- Cmd/Ctrl+Enter handler no-ops when busy (`if (busy) return;`) — present at lines 209–215.
- Send-button DOM now wraps label + spinner spans (`sendLabel`, `sendSpinner` with `aria-hidden`) — present at lines 82–91.

## Post-merge review flag

- The incoming file imports `tiptap`, `marked`, `dompurify`, and `./tool-result-renderers.js`. None are present in `packages/builder-ui/package.json` or `src/components/` in the current resync-branch state (the prior resync step at `report-1c87f484` already took the incoming `index.ts` which re-exports `tool-result-renderers` despite the file being absent — same pattern). This is the expected interim broken state for this resync chain; downstream cherry-picks will land the missing files and deps. Flagged for post-merge build verification.

## Other working-tree entries (not in conflict, untouched here)

- `apps/control-app/public/builder.html` (M) and `package.json` (M) — auto-merged cleanly; carry the incoming CSS additions and the 0.0.9 → 0.0.10 version bump.
- Seven `tests/test_UAT_FC_REQ-32_*.ts` files (A) — already staged from the incoming commit; left as-is.
