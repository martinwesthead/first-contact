---
uid: capability-c67fb2e2
id: CAP-54
type: capability
title: Chat Session & Reference-Doc API
created_by: xgd
created_at: '2026-06-30T04:15:07.412313+00:00'
updated_at: '2026-06-30T04:15:07.412313+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Chat Session & Reference-Doc API
---

HTTP/JSON API surface (control-app) for managing per-site chat sessions and
reading the platform reference-doc library. Sits on top of the persistence
substrate owned by CAP-53 (Chat & Reference-Doc Persistence).

Owns the observable request/response contract for:
- Chat sessions — create, recency-ordered site-scoped listing with pagination,
  operator title edit, and cascade delete with R2 attachment sweep.
- Chat messages — session-scoped tail read and backward pagination, and atomic
  append that allocates a strictly increasing per-session ordinal and updates
  session recency/volume denormals.
- Reference docs — listing (slug/title/summary/kind) and full-or-section read.

Distinct from CAP-43 (Operator API), which owns the typed operator-action
registry and its SSE channel under /api/operator/*. Distinct from the chat /
Anthropic-proxy turn handler (POST /api/chat), which is owned by STORY-46.
Per-site authorization is stubbed in v1 (single operator); the AI-facing,
site-scoped transcript search/read tools are owned by the chat-handler story,
not this API surface.
