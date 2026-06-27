---
uid: acceptance_criterion-8be17685
id: AC-544
type: acceptance_criterion
title: Unknown operator action name returns 404 without side effects
created_by: xgd
created_at: '2026-06-27T00:08:46.587802+00:00'
updated_at: '2026-06-27T00:08:46.587802+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
A POST to `/api/operator/<some_name_not_in_the_registry>` returns HTTP 404 with a body identifying the unknown action name. No handler runs and no SSE event is emitted on any session channel.

## Verification
A UAT opens an SSE subscription on a known session id, then sends `POST /api/operator/does_not_exist` with valid headers and an empty JSON body. The HTTP response status is 404 and the body mentions the offending action name. The SSE subscription receives no `action:notify` or `validation:error` frame within a 200ms window after the POST completes.
