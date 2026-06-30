---
uid: story-721e8feb
id: STORY-70
type: story
title: Chat session & reference-doc HTTP API
created_by: xgd
created_at: '2026-06-30T04:15:34.254567+00:00'
updated_at: '2026-06-30T04:23:47.205068+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-44f53d53
  capability_uid: capability-c67fb2e2
  story_kind: feature
  story_points: 3
---

## Story

**As a** builder client (and operator) of a site,
**I want** a JSON HTTP API to create, list, read, append to, retitle, and delete
per-site chat sessions, and to list and read platform reference documents,
**so that** conversation history can be durably managed over a stable interface
and reference material can be retrieved on demand, without one site's sessions
being visible when listing another site's.

## Description

Provides the HTTP/JSON API surface over the chat-session and reference-doc
persistence substrate (CAP-53). All endpoints return JSON.

In scope — chat sessions:
- Create a session under a site (optional title; title is left empty when
  omitted, to be filled after the first turn).
- List a site's sessions, newest-activity-first, with a result-count limit and
  before-cursor pagination; the listing is isolated to the requested site.
- Append a message to a session: the server allocates the next per-session
  ordinal (strictly increasing, gap-free) and updates the session's recency and
  message-count denormals as one atomic operation; the appended message is
  returned.
- Read a session's messages: with no cursor, return the most-recent page in
  chronological (ascending-ordinal) order; with a before-cursor, return the
  page of messages preceding that ordinal, also chronological.
- Edit a session's title.
- Delete a session: messages are removed by cascade and any R2 attachment
  objects referenced from the session's stored tool-call data are swept; the
  set of swept keys is reported.

In scope — reference docs:
- List reference docs as slug/title/summary/kind entries.
- Read one reference doc in full (slug, title, summary, table of contents,
  body), or narrow the returned body to a single named section.

Out of scope (owned elsewhere): the chat/Anthropic turn endpoint POST /api/chat
and its tail-prime + AI memory tools (STORY-46 / item 3); reference-doc seed
content; the builder UI; full authorization/multi-tenancy beyond a reserved
user slot; semantic/vector search; reference-doc write/edit endpoints.

## Technical Context

- Grounded in REQ-24 (commit 85705dd): apps/control-app/src/chat-routes.ts
  (route matching + handlers) and the data-access functions in chat-db.ts,
  mounted from src/index.ts. Architecture policy: control-app endpoints run as
  Cloudflare Workers over D1 (sessions/messages/reference docs) and R2
  (attachments) [DOC-5 #2, #4, #5].
- Per-site scoping is enforced on the session-list endpoint (queries filter by
  site). Message read/append/delete and title-edit endpoints address a session
  by its identifier directly and do not re-check site ownership at the HTTP
  layer; the AI-facing, site-scoped transcript search/read tools that DO enforce
  cross-site isolation are owned by the chat-handler story (item 3), not this
  API.
- Atomic append: D1 has no interactive transactions, so the message insert and
  the session denorm update are issued as one batch.
- Reference-doc full-text search infrastructure (FTS5) lives in the shared
  data layer but is not exposed as an HTTP endpoint by this story; it is
  consumed by the AI memory tools (item 3).

### Intent / code divergences (flagged for regression, not corrected here)
- REQ-24 sketched the create-session response as `{id, siteId, createdAt}`; the
  code returns the full session record (identifier, site association, title,
  timestamps, message count) at HTTP 201. The ACs describe the code's behaviour
  (a created session is returned and is then visible in the list).
- REQ-24 did not specify behaviour when a reference-doc `section` is not found;
  the code returns the full body in that case (rather than an error). The AC
  documents this fallback.

## Dependencies

- Item 1 (CAP-53, story-1e174b7c): chat-session/message/reference-doc schema,
  FTS, cascade relationships.

## Story Points

3