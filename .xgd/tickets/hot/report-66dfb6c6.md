---
uid: report-66dfb6c6
id: REPORT-586
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T00:28:44.466775+00:00'
updated_at: '2026-06-27T00:28:44.466775+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `packages/builder-ui/src/index.ts` (UU, code file under packages/builder-ui/src/**) — Rule 2c (INCOMING IS AUTHORITATIVE). HEAD side at the conflict region was empty (no exports for the missing modules). Incoming side adds export blocks for `chat-card`, `tool-result-renderers`, `digest-report`, `convert-confirmation`, and `transcribe-progress`. Took the full incoming block; no overlapping changes from HEAD to integrate.

## Incoming changes preserved

- `packages/builder-ui/src/index.ts`: incoming exports `createConvertConfirmationRenderer`, `registerConvertConfirmation`, `createTranscribeProgressCard`, `createTranscribeProgressRenderer`, `applyTranscribeEvent`, `registerTranscribeProgress`, `TranscribeProgressHandle`, `TranscribeProgressPayload` all present in resolved file (verified: `grep -n "convert-confirmation\|transcribe-progress" packages/builder-ui/src/index.ts` → hits at lines 60 and 68). Also preserved: `createChatCard`, `clearToolResultRenderers`, `getRegisteredToolResultRenderer`, `registerToolResultRenderer`, `renderToolResult`, `createDigestReportRenderer`, `registerDigestReport` exports from incoming side.
- `packages/builder-ui/src/components/convert-confirmation.ts` (new file, A): staged unchanged from cherry-picked commit 0f6d904a.
- `packages/builder-ui/src/components/transcribe-progress.ts` (new file, A): staged unchanged from cherry-picked commit.
- `tests/test_UAT_FC_REQ-28_convert_confirmation_card.test.ts` and `tests/test_UAT_FC_REQ-28_transcribe_progress_card.test.ts` (new test files, A): staged unchanged.

## Notes

The incoming exports reference `./components/chat-card.js` and `./components/tool-result-renderers.js`, which are not present on this resync branch yet — they belong to the earlier REQ-13 commit (`8a2721df`/`8628a0a8`) which has not been cherry-picked yet. Per Rule 2c, INCOMING is authoritative even when downstream compile is broken; discarding the exports would have been data loss. Build will resolve once REQ-13 is picked.

Staging verified clean — no UU/AA/DU/UD entries in `git status --porcelain`. `git cherry-pick --continue` was NOT called (Python owns that in the next workflow step).
