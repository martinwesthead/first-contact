---
uid: acceptance_criterion-bc6ebf59
id: AC-552
type: acceptance_criterion
title: State-edit actions cannot be invoked through the direct POST dispatcher
created_by: xgd
created_at: '2026-06-27T00:09:22.504949+00:00'
updated_at: '2026-06-27T00:09:22.504949+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
A POST to `/api/operator/<state_edit_action_name>` is rejected with HTTP 400 and a body explaining that state-edit tools execute client-side via the chat surface. No SSE event is emitted and no server-side state changes.

## Verification
A UAT subscribes to SSE on `session_id=sess-7`, then sends `POST /api/operator/set_module_content` with `x-session-id: sess-7`, `x-plan-tier: trial`, and a JSON body. The HTTP response is 400 and the body mentions that the action is a state-edit tool routed through the chat path. The SSE subscription receives no `state:diff`, `action:notify`, or `validation:error` frame within a 200ms window.
