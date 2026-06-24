---
uid: comment-a723b653
id: COMMENT-133
type: comment
title: Comment on request REQ-43
created_by: xgd
created_at: '2026-06-20T23:30:05.583884+00:00'
updated_at: '2026-06-20T23:30:05.583884+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-65dcc242
  kind: note
---

Cross-attribution note: REQ-43's free-coded SHA list contains only f2d9508 (meta.ts re-export + LLM context bullet). The bulk of REQ-43's implementation — packages/framework/src/modules/logo-strip/{meta.ts,index.astro}, the registry.ts/index.ts entries for logo-strip@v1, and the four tests/test_UAT_FC_REQ-43_logo_strip_*.test.ts UATs — was committed in e505d92 ('chore: bump 0.0.21 → 0.0.22 (REQ-42) [FREE-CODED]'), which is recorded against REQ-42 (request-e220320e). The concurrent REQ-42 free-coding session's git add swept up our untracked files. xgd refused to register e505d92 against two tickets (one-SHA-one-ticket rule), so the attribution lives in commit messages + ticket comments instead. Reconcile must consult both SHAs to replay REQ-43.