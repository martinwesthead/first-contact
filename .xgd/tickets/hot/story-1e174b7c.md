---
uid: story-1e174b7c
id: STORY-69
type: story
title: Persistence schema for per-site chat sessions and the reference-doc library
created_by: xgd
created_at: '2026-06-30T04:06:34.244240+00:00'
updated_at: '2026-06-30T04:12:51.883093+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-44f53d53
  capability_uid: capability-46b35357
  story_kind: feature
  story_points: 2
---

## Story

**As a** platform builder relying on durable conversation and reference data,
**I want** the data store to durably persist per-site chat sessions and their
messages, and a searchable platform reference-doc library, **so that** chat
history survives across sessions and both transcripts and reference docs can be
retrieved and full-text searched per site without losing or leaking data
between sites.

## Description

Provides the persistence substrate (data store schema) for two capabilities
that build on it:

- **Per-site chat sessions** — each session belongs to exactly one site,
  carries an optional title and an optional owning user (reserved for future
  auth), and records recency/volume so sessions can be listed for a site
  newest-activity-first. Sessions are removed automatically when their site is
  removed.
- **Append-only chat messages** — messages are appended to a session in a
  strictly increasing per-session ordinal sequence, each carrying a role,
  textual content, and optional structured tool-call data. Messages are removed
  automatically when their session (or its site) is removed. Message content is
  full-text searchable, and that search is scoped to a single site.
- **Reference-doc library** — a platform-level library of reference documents,
  each identified by a unique slug and carrying a title, summary, table of
  contents, body, and kind. Documents are full-text searchable over title,
  summary, and body, and listable/filterable by kind.

In scope: the storage tables, their access-path indexes, full-text search that
stays consistent as rows are inserted/updated/deleted, cascade-on-delete
relationships, and reversible migrations that leave the pre-existing
accounts/sites/revisions schema (CAP-50) intact.

Out of scope (per REQ-23 / DOC-10, owned by other capabilities): HTTP API
endpoints over this data, reference-doc seed content, builder UI, and
semantic/vector search.

## Technical Context

- Grounded in REQ-23 (commit b6dd188f): migrations `0006_create_chat_sessions`,
  `0007_create_chat_messages`, `0008_create_reference_docs` plus reverse-order
  down migrations, and the record types added to `packages/site-schema`.
- Builds on CAP-50 (Site Data Model & Persistence): `chat_sessions.site_id`
  references `sites.id` with cascade delete. This schema must not alter the
  accounts/sites/revisions tables.
- Full-text search is provided by SQLite FTS5 virtual tables kept in sync with
  the base tables via insert/update/delete triggers. Per-site message search is
  achieved by joining matches back through the owning session's site.
- Intent→implementation divergences (non-behavioral, noted for regression):
  (1) DOC-10 named the migrations `005/006/007`; they landed as `0006/0007/0008`
  because `0005` is the 1stcontact seed migration. (2) DOC-10 named the types
  `ChatSession/ChatMessage/ReferenceDoc`; they landed as `ChatSessionRecord`,
  `ChatMessageRecord` (+ `ChatMessageRecordParsed`), and `ReferenceDocRecord`
  (+ `ReferenceDocRecordParsed`), matching the existing `*Record` convention.
- The denormalized `last_message_at` / `message_count` columns on
  `chat_sessions` exist in this schema but are maintained by the chat API
  (separate capability), not by the schema itself.

## Dependencies

None within this bundle. Depends on the pre-existing `sites` table (REQ-10 /
CAP-50). Foundational for the chat session HTTP API and reference-doc seed
(later bundle items).

## Story Points

2