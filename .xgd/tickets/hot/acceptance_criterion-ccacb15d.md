---
uid: acceptance_criterion-ccacb15d
id: AC-550
type: acceptance_criterion
title: validation:error event payload carries path, expected, and got fields
created_by: xgd
created_at: '2026-06-27T00:09:13.724174+00:00'
updated_at: '2026-06-27T00:09:13.724174+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
When a validation rejection is reported through the operator surface, an SSE frame with `event: validation:error` is delivered to subscribers of the matching session. The frame's `data` JSON payload includes `path` (string identifying the offending input field), `expected` (description of the expected shape), and `got` (the received value).

## Verification
A UAT opens an SSE subscription on `session_id=sess-6`, then sends `POST /api/operator/report_validation_rejection` with `x-session-id: sess-6` and body `{"tool":"set_module_content","path":"modules[2].body","expected":"string","got":42,"message":"type mismatch"}`. The subscription receives a frame with event line `validation:error` whose `data:` JSON has `path: "modules[2].body"`, `expected: "string"`, and `got: 42`.
