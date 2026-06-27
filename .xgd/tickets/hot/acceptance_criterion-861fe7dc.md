---
uid: acceptance_criterion-861fe7dc
id: AC-546
type: acceptance_criterion
title: Plan-tier mismatch returns 403 with both tiers identified and skips handler
created_by: xgd
created_at: '2026-06-27T00:08:55.174455+00:00'
updated_at: '2026-06-27T00:08:55.174455+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
A POST to a system action whose required plan tier exceeds the request's plan tier returns HTTP 403. The response body identifies both the required tier and the request's tier. The action's handler does not run, no SSE `action:notify` is emitted, and no server-side side effect occurs.

## Verification
A UAT subscribes to SSE on session `sess-2`, then sends `POST /api/operator/publish_stub` with `x-plan-tier: trial` and `x-session-id: sess-2`. The response is 403, the body contains both `"paid"` (the action's required tier) and `"trial"` (the caller's tier). Within a 200ms window after the POST, the SSE channel receives no `action:notify` frame.
