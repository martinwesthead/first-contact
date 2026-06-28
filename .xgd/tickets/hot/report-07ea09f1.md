---
uid: report-07ea09f1
id: REPORT-736
type: report
title: 'Reconcile resolve conflicts: reconcile-BUNDLE-5'
created_by: xgd
created_at: '2026-06-28T22:01:12.202594+00:00'
updated_at: '2026-06-28T22:01:12.202594+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: reconcile-BUNDLE-5
---

## Files resolved

- `packages/builder-ui/src/main.ts` — class **UU** (both modified). Rule **2c** (UU on code file, incoming authoritative).
  - Ours (HEAD): `fix(builder-ui): send x-session-id on chat POSTs` — added `registerTranscribeProgress` (import + boot call) and the `fc:digest-convert-requested` digest-convert listener bridge (REQ-30). These do not exist on the incoming commit's base.
  - Theirs (incoming `58fce2bc`, free_coded): `feat(convert): remove destructive-confirmation gate` (REQ-35) — removed `registerConvertConfirmation` import + call, and the `handleConvertConfirmed` / `handleConvertCancelled` listeners (dispatched only by the now-deleted `convert-confirmation.ts` card).
  - Resolution: applied the incoming removals in full (overlapping region — incoming wins), and combined the non-overlapping HEAD additions. Result keeps `registerTranscribeProgress` + `handleDigestConvertRequested` while dropping every convert-confirmation symbol.

## Incoming changes preserved

- `packages/builder-ui/src/main.ts`: verified the incoming commit's changes are present in the resolution —
  - `registerConvertConfirmation` import: **removed** ✓
  - `registerConvertConfirmation()` boot call: **removed** ✓
  - `handleConvertConfirmed` / `handleConvertCancelled` handlers + their `fc:convert-confirmed` / `fc:convert-cancelled` listeners and destroy-time removals: **removed** ✓
  - No stale references to any removed convert-confirmation symbol remain in `packages/builder-ui/src/`.
  - HEAD-only additions not touched by the incoming commit (`registerTranscribeProgress`, `handleDigestConvertRequested`, `fc:digest-convert-requested`) retained — `transcribe-progress.ts` exists and `fc:digest-convert-requested` is dispatched by `digest-report.ts`, so both kept symbols remain wired.
