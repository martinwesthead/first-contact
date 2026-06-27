---
uid: report-1c87f484
id: REPORT-582
type: report
title: 'Resync resolve conflicts: 0f6d904a'
created_by: xgd
created_at: '2026-06-27T00:28:02.387576+00:00'
updated_at: '2026-06-27T00:28:02.387576+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-46c95d09
---

## Files resolved

- `packages/builder-ui/src/index.ts` (UU, code file) — INCOMING wins per rule 2c. HEAD had only chat-panel/preview-panel/builder-layout exports. Incoming side adds export blocks for `chat-card`, `tool-result-renderers`, `digest-report`, `convert-confirmation`, and `transcribe-progress` modules. Took the full incoming block; no overlapping changes from HEAD to integrate.

## Incoming changes preserved

- `index.ts`: incoming exports `createConvertConfirmationRenderer`, `registerConvertConfirmation`, `createTranscribeProgressCard`, `createTranscribeProgressRenderer`, `applyTranscribeEvent`, `registerTranscribeProgress`, `TranscribeProgressHandle`, `TranscribeProgressPayload` are present at lines 59–70 of the resolved file. Verified with `grep -n "convert-confirmation\|transcribe-progress" packages/builder-ui/src/index.ts` (two hits at the new export blocks).
- `convert-confirmation.ts` and `transcribe-progress.ts` (new files) staged unchanged from the cherry-picked commit.
- UAT test files `tests/test_UAT_FC_REQ-28_convert_confirmation_card.test.ts` and `tests/test_UAT_FC_REQ-28_transcribe_progress_card.test.ts` staged unchanged.

## Notes

The incoming exports reference `./components/chat-card.js` and `./components/tool-result-renderers.js`, which do not yet exist on this resync branch — they belong to the earlier REQ-13 commit (`8a2721df` / `8628a0a8`) that has not been picked yet. Per the resync rule, INCOMING is authoritative even when downstream compile is broken; the build will resolve once REQ-13 is cherry-picked. Discarding the exports would have been data loss.
