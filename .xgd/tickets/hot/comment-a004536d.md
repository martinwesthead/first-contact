---
uid: comment-a004536d
id: COMMENT-304
type: comment
title: Comment on acceptance_criterion AC-597
created_by: xgd
created_at: '2026-06-30T06:09:32.806379+00:00'
updated_at: '2026-06-30T06:09:32.806379+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: acceptance_criterion-b12d81c8
  kind: note
---

Archived during reconciliation of BUNDLE-10 (REQ-53 render-by-default, commit 72effe61).
This AC documents the `shouldEscalateToRendered` escalation decision (thin-body /
JS-dominant / force-rendered). The code that implemented that decision —
`packages/extractor/src/escalate.ts` and the `shouldEscalateToRendered` export —
was deleted: the rendered path now runs unconditionally on every `analyze_page`
call, with the static path as the degraded fallback. The escalation heuristic no
longer exists, so this behavior is no longer implemented. Render-by-default is
documented by AC-617, AC-622, and AC-822. The three escalation-heuristic UATs were
deleted in the same commit.
