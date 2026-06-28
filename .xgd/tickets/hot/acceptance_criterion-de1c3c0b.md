---
uid: acceptance_criterion-de1c3c0b
id: AC-610
type: acceptance_criterion
title: A JS-dominant document escalates to the rendered path
created_by: xgd
created_at: '2026-06-28T19:41:43.910524+00:00'
updated_at: '2026-06-28T19:41:43.910524+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given a fetched document whose `<script>` content exceeds 80% of the `<body>` byte size, the escalation decision reports `escalate: true` with reason `js_dominant` — even when the visible body text on its own would not be considered thin. This catches JS-rendered apps whose static HTML is mostly bundled script.

## Verification
Invoke the escalation decision against a page whose body is dominated by inline `<script>` bytes (script bytes > 80% of body bytes) → assert `escalate: true` and reason `js_dominant`.
