---
uid: acceptance_criterion-2f17b6c9
id: AC-548
type: acceptance_criterion
title: SSE endpoint streams the five event types, heartbeats, and closes cleanly on
  disconnect
created_by: xgd
created_at: '2026-06-27T00:09:05.642725+00:00'
updated_at: '2026-06-27T00:09:05.642725+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
`GET /api/operator/events?session_id=<id>` returns a response with `content-type: text/event-stream` and stays open. The channel can deliver frames whose `event:` line is any of `chat:append`, `state:diff`, `state:invalidate`, `action:notify`, or `validation:error`, each carrying a JSON `data:` payload. The connection emits a heartbeat frame (event or comment) on roughly a 15-second cadence. When the client aborts the request, the server-side subscription is removed (subsequent publishes to that session do not error and the subscriber count drops to zero) and no resources leak.

## Verification
A UAT opens `GET /api/operator/events?session_id=sess-4`, asserts response status 200 and the `text/event-stream` content-type, and reads the initial connection frame. With a virtual or accelerated clock, the UAT advances ~15s and observes a heartbeat frame on the stream. The UAT then aborts the request; a subsequent inspection (test hook or follow-up publish that would otherwise be observable) confirms the subscription has been released. Requesting the endpoint without `session_id` returns 400.
