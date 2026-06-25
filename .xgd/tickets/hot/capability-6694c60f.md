---
uid: capability-6694c60f
id: CAP-38
type: capability
title: Builder UI
created_by: xgd
created_at: '2026-06-25T01:57:53.330656+00:00'
updated_at: '2026-06-25T01:57:53.330656+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Builder UI
---

Operator-facing builder: a chat-driven SPA in which a site owner edits their site definition by talking to an AI assistant, with a live in-browser preview, four-layer validation of every AI tool call, and persistence of working state to localStorage. Backed by an Anthropic-proxy /api/chat endpoint on the control-app Worker and served from /builder via Workers Static Assets.