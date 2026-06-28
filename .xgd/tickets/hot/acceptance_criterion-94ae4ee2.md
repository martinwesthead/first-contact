---
uid: acceptance_criterion-94ae4ee2
id: AC-611
type: acceptance_criterion
title: A force-rendered request escalates unconditionally
created_by: xgd
created_at: '2026-06-28T19:41:46.839922+00:00'
updated_at: '2026-06-28T19:41:46.839922+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
When the caller explicitly requests rendering (the force-rendered / "render this page" option), the escalation decision reports `escalate: true` (reason `operator_request`) unconditionally — regardless of body density or script ratio. A content-rich page that would otherwise report `escalate: false` still escalates when force-rendered is set.

## Verification
Invoke the escalation decision with force-rendered set against a content-rich page that on heuristics alone would report `escalate: false` → assert `escalate: true`.
