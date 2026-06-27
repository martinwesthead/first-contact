---
uid: acceptance_criterion-d75fa387
id: AC-549
type: acceptance_criterion
title: Successful system action delivers an action:notify SSE frame to subscribers
created_by: xgd
created_at: '2026-06-27T00:09:09.648177+00:00'
updated_at: '2026-06-27T00:09:09.648177+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
When a system action handler completes successfully, an SSE frame with `event: action:notify` is delivered to every subscriber of the matching `session_id` within 100ms of the HTTP response. The frame's JSON `data` payload contains at minimum an `action` field naming the action and a `status` field describing the outcome.

## Verification
A UAT opens an SSE subscription on `session_id=sess-5`, then sends `POST /api/operator/publish_stub` with `x-session-id: sess-5` and `x-plan-tier: paid`. Within 100ms of receiving the 200 HTTP response, the SSE subscription receives a frame whose event line is `action:notify`. Parsing the `data:` JSON yields an object with `action: "publish_stub"` and `status: "published"`.
