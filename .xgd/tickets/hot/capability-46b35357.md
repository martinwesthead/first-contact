---
uid: capability-46b35357
id: CAP-53
type: capability
title: Chat & Reference-Doc Persistence
created_by: xgd
created_at: '2026-06-30T04:06:09.762844+00:00'
updated_at: '2026-06-30T04:06:09.762844+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Chat & Reference-Doc Persistence
---

Persistence substrate in D1 for per-site chat sessions and the platform-level
reference-doc library described in DOC-10.

Owns the storage shape and access paths for:
- chat_sessions — per-site, recency-ordered conversation sessions (FK to sites,
  cascade on site delete; nullable user_id reserved for future auth).
- chat_messages — append-only, ordinally sequenced messages within a session
  (cascade on session delete), with full-text search over message content kept
  in sync via triggers.
- reference_docs — platform reference-doc library (title, summary, table of
  contents, body, kind) with full-text search over title/summary/body kept in
  sync via triggers, and listing/filtering by kind.

Distinct from CAP-50 (Site Data Model & Persistence), which owns the
accounts/sites/revisions site-definition storage. This capability owns the
chat-session and reference-doc storage tables, their full-text indexes, and the
reversibility of the migrations that create them. API endpoints, seed data, UI,
and semantic/vector search are out of scope (separate capabilities).
