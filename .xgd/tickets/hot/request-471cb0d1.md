---
uid: request-471cb0d1
id: REQ-38
type: request
title: Better AI execution feedback during build
created_by: xgd
created_at: '2026-06-20T21:09:44.034527+00:00'
updated_at: '2026-06-20T21:11:22.170581+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

When I (the AI) fire multiple tool calls in a batch, if one fails or drops I currently have no reliable way to know. I need per-call success/failure results that are guaranteed to be returned before the next batch fires. This is partly a framework constraint and partly how the chat loop handles parallel calls.