---
uid: request-cb35929b
id: REQ-23
type: request
title: 'D1 schema: chat sessions + messages (FTS5) + reference docs (FTS5)'
created_by: xgd
created_at: '2026-06-16T23:26:59.484714+00:00'
updated_at: '2026-06-18T22:27:26.918407+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: medium
  story_points: 3
  auto_merge_back: true
  needs_review: false
---

# D1 schema: chat sessions + messages (FTS5) + reference docs (FTS5)

Schema-only REQ. Lays the persistence substrate for per-site chat sessions and the platform-level reference doc library described in [[DOC-10]].

Design discussion: see [[DOC-10]] §4, §6, §8 and the transcript excerpts in Appendix A below.

## Why free-coded

Schema-only — single cohesive intent, no algorithmic design. Decisions (per-site sessions, append-only, FTS5 over content, D1-only bodies for reference docs) are settled in [[DOC-10]]. Translation to SQL only.

## Dependencies

- Blocking on [[REQ-10]] (`sites` table). `chat_sessions.site_id` is a FK to `sites.id`.
- Foundational for the API REQ (chat session endpoints) and the reference-docs seed REQ.

## Scope

### IN

- New migrations in `db/migrations/`:
  - `005_chat_sessions.sql` — `chat_sessions` table.
  - `006_chat_messages.sql` — `chat_messages` table + `chat_messages_fts` FTS5 virtual table + triggers to keep FTS in sync.
  - `007_reference_docs.sql` — `reference_docs` table + `reference_docs_fts` FTS5 virtual table + triggers.
- Indices for the access patterns named in [[DOC-10]] §7 (session list by `site_id` ordered by `last_message_at`; message tail by `session_id` ordered by `ord`).
- TypeScript types in `packages/site-schema/` (or a new `packages/chat-schema/` if reviewer prefers — propose during implementation): `ChatSession`, `ChatMessage`, `ReferenceDoc`.
- `user_id` column on `chat_sessions`, nullable, no FK yet — populated later when auth lands ([[DOC-10]] §12 open question).

### OUT

- API endpoints — separate REQ.
- Seed data for `reference_docs` — separate REQ.
- UI — separate REQ.
- Vectorize / semantic search — explicitly deferred per [[DOC-10]] §10.

## Deliverables

### `005_chat_sessions.sql`

```sql
CREATE TABLE chat_sessions (
  id               TEXT PRIMARY KEY,
  site_id          TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id          TEXT,                          -- nullable; populated when auth lands
  title            TEXT,                          -- AI-generated after first turn, operator-editable
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  last_message_at  INTEGER,                       -- denormalized for fast list ordering
  message_count    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_chat_sessions_site_last ON chat_sessions(site_id, last_message_at DESC);
```

### `006_chat_messages.sql`

```sql
CREATE TABLE chat_messages (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  ord              INTEGER NOT NULL,              -- per-session monotonic; allocated server-side
  role             TEXT NOT NULL,                 -- 'user' | 'assistant' | 'system' | 'tool_result'
  content          TEXT NOT NULL,
  tool_calls_json  TEXT,                          -- JSON array; NULL when no tool calls
  ts               INTEGER NOT NULL,
  UNIQUE(session_id, ord)
);
CREATE INDEX idx_chat_messages_session_ord ON chat_messages(session_id, ord);

CREATE VIRTUAL TABLE chat_messages_fts USING fts5(
  content,
  session_id UNINDEXED,
  ord UNINDEXED,
  content='chat_messages',
  content_rowid='rowid'
);

-- Sync triggers (insert/update/delete)
CREATE TRIGGER chat_messages_ai AFTER INSERT ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(rowid, content, session_id, ord)
  VALUES (new.rowid, new.content, new.session_id, new.ord);
END;
CREATE TRIGGER chat_messages_ad AFTER DELETE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, ord)
  VALUES ('delete', old.rowid, old.content, old.session_id, old.ord);
END;
CREATE TRIGGER chat_messages_au AFTER UPDATE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, ord)
  VALUES ('delete', old.rowid, old.content, old.session_id, old.ord);
  INSERT INTO chat_messages_fts(rowid, content, session_id, ord)
  VALUES (new.rowid, new.content, new.session_id, new.ord);
END;
```

FTS5 search MUST be joined with `chat_sessions` on the API side to enforce per-site scoping ([[DOC-10]] §7.3).

### `007_reference_docs.sql`

```sql
CREATE TABLE reference_docs (
  slug         TEXT PRIMARY KEY,                  -- e.g. 'modules/hero-split'
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,                     -- distilled, returned by list_reference_docs tool
  toc_json     TEXT NOT NULL,                     -- JSON: [{section_slug, description}]
  body         TEXT NOT NULL,                     -- full markdown
  kind         TEXT NOT NULL,                     -- 'architecture' | 'module' | 'design-decision' | ...
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_reference_docs_kind ON reference_docs(kind);

CREATE VIRTUAL TABLE reference_docs_fts USING fts5(
  title, summary, body,
  slug UNINDEXED,
  content='reference_docs',
  content_rowid='rowid'
);
-- Same insert/update/delete trigger pattern as chat_messages.
```

### Types (`packages/site-schema/src/chat.ts` or new package)

```ts
export interface ChatSession { id: string; siteId: string; userId: string | null; title: string | null; createdAt: number; updatedAt: number; lastMessageAt: number | null; messageCount: number; }
export interface ChatMessage { id: string; sessionId: string; ord: number; role: "user" | "assistant" | "system" | "tool_result"; content: string; toolCalls?: ReadonlyArray<{name: string; input: Record<string, unknown>}>; ts: number; }
export interface ReferenceDoc { slug: string; title: string; summary: string; toc: ReadonlyArray<{sectionSlug: string; description: string}>; body: string; kind: string; createdAt: number; updatedAt: number; }
```

## Acceptance criteria

1. Migrations `005`, `006`, `007` apply cleanly against a database that already has `001`–`004` (leads + REQ-10 schema).
2. Migrations are reversible (down migration drops in reverse order, including FTS5 tables before base tables).
3. Inserting a row into `chat_messages` makes it queryable via `chat_messages_fts MATCH 'token'` on the same connection.
4. Updating `chat_messages.content` updates the FTS index (verified by query).
5. Deleting a `chat_sessions` row cascades to `chat_messages` (and FTS index stays consistent via trigger).
6. Deleting a `sites` row cascades to all its `chat_sessions` (and transitively to messages and FTS index).
7. `idx_chat_sessions_site_last` is used by `EXPLAIN QUERY PLAN SELECT * FROM chat_sessions WHERE site_id = ? ORDER BY last_message_at DESC LIMIT 20`.
8. `idx_chat_messages_session_ord` is used by `EXPLAIN QUERY PLAN SELECT * FROM chat_messages WHERE session_id = ? AND ord < ? ORDER BY ord DESC LIMIT 50`.
9. `reference_docs_fts MATCH 'token'` returns matching rows after seeding.

## Test plan (UAT-primary)

Tests under `tests/`, named `test_UAT_FC_<TICKET-ID>_*.ts`. Stack: vitest + Miniflare's local D1 emulator.

- `test_UAT_FC_<TICKET-ID>_session_crud.ts` — insert / select / cascade delete `chat_sessions`.
- `test_UAT_FC_<TICKET-ID>_message_append_and_fts.ts` — append messages, query FTS for inserted tokens, verify update/delete sync.
- `test_UAT_FC_<TICKET-ID>_per_site_scope_query.ts` — confirm the canonical scoped search SQL (joining FTS to `chat_sessions` on `site_id`) returns only matching session messages and uses the expected indices.
- `test_UAT_FC_<TICKET-ID>_reference_docs_fts.ts` — insert a doc, search for tokens in title / summary / body, verify retrieval.
- `test_UAT_FC_<TICKET-ID>_cascade_site_delete.ts` — delete a site, verify sessions, messages, and FTS rows are all gone.

## Notes for implementer

- D1's SQLite version supports FTS5 — no separate extension load required, but verify against the wrangler-emulated D1 first.
- Per-session `ord` allocation is server-side responsibility (next REQ); schema enforces uniqueness only.
- `tool_calls_json` is a TEXT column carrying JSON. Consumers parse on read. No SQL-side validation.
- `user_id` nullable today; do NOT add a FK constraint yet — `accounts` exists per [[REQ-10]] but the binding rule will be set by the auth REQ.
- Forward-compat with KMS / Vectorize ([[DOC-10]] §10): nothing in this schema precludes adding a `chat_messages_vec` table later that mirrors `chat_messages_fts`.

---

## Appendix A — Transcript context

For resuming this work in an intent-specific session.

### From CHAT-13 (operator, final turn)

> Please note I do want to maintain our chat sessions. And I want the transcripts to be available to the AIs. The simplest approach here is that the session just grows in an unbounded way and we typically only load and reference parts of it.

### From CHAT-13 (operator, earlier turn)

> I am working on a knowledge management system that could generate mechanical summaries of documents and might be associated with a read tool that could read a section. So the summary would contain whatever the first 200-400 characters of the document plus a "table of contents" - the AI can then access the bits of the document(s) that it needs when it needs them.

→ Schema implication: `reference_docs` carries `summary` + `toc_json` + `body` as separate columns from day one so the KMS retrofit is free.

### From current conversation (operator)

> Sessions are per site no cross site references needed

→ Schema implication: `chat_sessions.site_id` is mandatory; FTS searches MUST join through it. No global / cross-site index.

### From current conversation (assistant, proposed shape)

> D1 with FTS5 for sessions and messages, R2 for blobs … `sessions(id, site_id, title, created_at, updated_at, last_message_at)` … `messages(id, session_id, ord, role, content, tool_calls_json, ts)` + FTS5 over `content`.



---

## Demo critical-path status (added 2026-06-18)

**Deferred from the convert-flow demo critical path** per the 2026-06-18 planning chat. The demo (paste URL → reproduce site) runs against [[REQ-8]]'s in-memory chat handler with no persistence. This REQ lands the durable foundation; the integration-back into the convert tools ([[REQ-21]] / [[REQ-22]] / [[REQ-28]]) is a follow-on refactor.

Those three REQs each carry a "Future alignment: persistent chat infrastructure" section describing the eventual wire-up — those notes describe the post-this-REQ runtime path, not the demo's flow. When this REQ lands, the refactor is mechanical (the structured `tool_result` payloads already produced by the convert tools reach the `chat_messages` row through this REQ's dispatcher without schema changes).

Implementation ordering: the demo slice (REQ-20 → REQ-13 → REQ-21 → REQ-22 → REQ-28) lands first to validate framework flexibility against a real reproduction target. This REQ comes after the demo confirms the framework is the right shape.
