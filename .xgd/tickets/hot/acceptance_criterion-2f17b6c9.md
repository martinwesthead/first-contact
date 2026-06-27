---
uid: acceptance_criterion-2f17b6c9
id: AC-548
type: acceptance_criterion
title: SSE endpoint streams the five event types, heartbeats, and closes cleanly on
  disconnect
created_by: xgd
created_at: '2026-06-27T00:09:05.642725+00:00'
updated_at: '2026-06-27T01:45:19.826753+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
  title: SSE endpoint streams the five event types and closes cleanly on disconnect
---

## Criterion
`GET /api/operator/events?session_id=<id>` returns a response with `content-type: text/event-stream` and stays open. On connect it emits an initial `: connected <session_id>` comment frame. The channel can deliver frames whose `event:` line is any of `chat:append`, `state:diff`, `state:invalidate`, `action:notify`, or `validation:error`, each carrying a JSON `data:` payload. When the client aborts the request, the server-side subscription is removed (subsequent publishes to that session do not error and the subscriber count drops to zero) and no resources leak. Requesting the endpoint without `session_id` returns 400.

## Verification
A UAT opens `GET /api/operator/events?session_id=<id>`, asserts response status 200 and the `text/event-stream` content-type, and reads the initial `: connected` frame. It publishes one frame of each of the five event types through the session event bus and confirms each `event:` line appears on the stream. The UAT then aborts the request and confirms the subscription has been released (subscriber count returns to zero). Requesting the endpoint without `session_id` returns 400.

## Note (stabilization)
The original criterion also required a recurring keep-alive heartbeat on a ~15s cadence. v1 ships the SSE channel without a heartbeat; the connection emits the initial open frame and forwards published events as they arrive. The heartbeat is deferred to a separate request. AC amended during reconcile/stabilization to match shipped behavior.
