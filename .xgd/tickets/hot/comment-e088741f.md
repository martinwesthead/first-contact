---
uid: comment-e088741f
id: COMMENT-206
type: comment
title: Comment on acceptance_criterion AC-548
created_by: xgd
created_at: '2026-06-27T01:45:29.189911+00:00'
updated_at: '2026-06-27T01:45:29.189911+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: acceptance_criterion-2f17b6c9
  kind: note
---

Amended during stabilization (reconcile bundle-bbb1bd9c): removed the recurring ~15s heartbeat requirement. Production (commit 483b0b55, the only commit to the SSE endpoint) has never implemented a heartbeat — there is no setInterval/ping/keepalive in apps/control-app/src/operator/events.ts. The SSE channel works as intended (initial connected frame, five event types, clean subscription teardown on abort). Heartbeat keep-alive is a future enhancement; re-introduce via a separate request. The UAT (test_UAT_AC548) was updated to drop the unobservable heartbeat assertion (it read a 300ms window for a 15s-cadence frame) while retaining the five-event-types, connected-frame, clean-close, and 400-on-missing-session checks.