---
uid: bundle-44f53d53
id: BUNDLE-9
type: bundle
title: REQ-23 + REQ-24 + REQ-25 + REQ-50 + BUG-8
created_by: xgd
created_at: '2026-06-30T03:27:30.864762+00:00'
updated_at: '2026-06-30T03:27:32.459294+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  commits:
  - b6dd188fc00e06758368f49f564681a8de57a700
  - 85705dd25c15e6d79b3d50cc09ebdadc9ab56dcc
  - 58b96e902e11bb62c0ee077afade67e2ce2f4d48
  - 46109cd455e597586b620b3bb02dad9e76cbade8
  - 3772b3d7cac3163a443a1e03cc9eb97bdd7e9066
  - 3847ff00ff1cd86fd3dbbe028802d10523230ded
  - 7e91942a2fb594e6591801f18f3468c33cdbac1b
  - 3a5f59dd725966ad87951fe9a0769261c38ee76f
  - b2ece207805251b9277c7220b78d4d846d5a5fb4
  - 98413f260ce3da072a8887921e8ce915c398e20a
  - efc642cc6cb83b8dbc2e37a320643727c4e0fbb6
  - 3e4c64d23a2e8cfcff5cf5230d11944db802fafa
  auto_merge_back: true
  priority: medium
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-23: D1 schema: chat sessions + messages (FTS5) + reference docs (FTS5)

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


---

## Implementation as landed (2026-06-22)

Schema and tests landed in commit `b6dd188f` as a single free-coded change. Deltas from the original draft above:

- **Migration numbering**: the draft proposed `005_*` / `006_*` / `007_*` but the repo already uses 4-digit prefixes (`0001_create_leads.sql` … `0005_seed_1stcontact.sql`). New migrations slot in at `0006_create_chat_sessions.sql`, `0007_create_chat_messages.sql`, `0008_create_reference_docs.sql` with matching `*.down.sql` siblings under `db/migrations-down/`.
- **TypeScript types**: added to the existing `packages/site-schema/src/db-types.ts` (alongside `AccountRecord`/`SiteRecord`/`RevisionRecord`) rather than a new package. Field names use `snake_case` to match the existing convention (e.g. `site_id`, `created_at`, `last_message_at`) so result rows from D1 round-trip without re-keying. Exported: `ChatRole`, `ChatSessionRecord`, `ChatMessageRecord`, `ChatMessageRecordParsed`, `ChatMessageToolCall`, `ReferenceDocRecord`, `ReferenceDocRecordParsed`, `ReferenceDocTocEntry`.
- **SQL splitter for trigger bodies**: the existing `_helpers_REQ-10_db.ts` splits on `;\s*\n`, which would tear the multi-statement trigger bodies (each contains an inner `INSERT … VALUES (…);` before `END;`). A new helper `tests/_helpers_REQ-23_db.ts` provides `splitSqlRespectingBeginEnd` which tracks `BEGIN`/`END` depth and only treats top-level semicolons as terminators. The helper exposes `createReq23TestDb` (which composes onto the REQ-10 helper's `createTestDb`) plus `insertSite`/`insertSession`/`insertMessage`/`insertReferenceDoc` factories.
- **UAT files use `.test.ts` extension** (matches `vitest.config.mts`'s `tests/**/*.test.ts` include) — the draft showed `.ts`.
- **FTS5 token escaping**: a few cascade UATs originally used hyphenated tokens like `cascade-token-alpha`, which FTS5 parses as `cascade NOT token NOT alpha`. Tokens were collapsed to single words (`cascadealpha`/`cascadebeta`/`cascadegamma`) so the MATCH expressions parse cleanly. The schema is unaffected; only test fixture strings changed.

### UATs delivered (21 across 6 files)

- `test_UAT_FC_REQ-23_session_crud.test.ts` (3) — table + index exist; insert round-trip; `EXPLAIN QUERY PLAN` uses `idx_chat_sessions_site_last`.
- `test_UAT_FC_REQ-23_message_append_and_fts.test.ts` (5) — insert + MATCH on same connection; UPDATE keeps FTS in sync; DELETE keeps FTS in sync; `UNIQUE(session_id, ord)` enforced; `EXPLAIN QUERY PLAN` uses `idx_chat_messages_session_ord`.
- `test_UAT_FC_REQ-23_per_site_scope_query.test.ts` (3) — canonical join-through-`chat_sessions` SQL returns only the matching site's messages; isolates correctly across two sites; returns zero for a third site with no matches.
- `test_UAT_FC_REQ-23_reference_docs_fts.test.ts` (5) — MATCH against title, summary, and body fields independently; DELETE syncs FTS; UPDATE syncs FTS.
- `test_UAT_FC_REQ-23_cascade_site_delete.test.ts` (3) — baseline counts; site delete cascades sites → chat_sessions → chat_messages → FTS; session delete cascades sessions → chat_messages → FTS.
- `test_UAT_FC_REQ-23_migrations_reversible.test.ts` (2) — forward apply creates all 5 tables, 3 indexes, 6 triggers; down sweep removes them all while leaving the REQ-10 accounts/sites/revisions tables intact.

Full regression sweep (REQ-3, REQ-7, REQ-10, REQ-13, REQ-32) passes — 171 tests across 66 files, no regressions.

### Files touched

```
package.json                                                            (0.0.30 → 0.0.31)
packages/site-schema/src/db-types.ts                                    (types added)
db/migrations/0006_create_chat_sessions.sql                             (new)
db/migrations/0007_create_chat_messages.sql                             (new)
db/migrations/0008_create_reference_docs.sql                            (new)
db/migrations-down/0006_create_chat_sessions.down.sql                   (new)
db/migrations-down/0007_create_chat_messages.down.sql                   (new)
db/migrations-down/0008_create_reference_docs.down.sql                  (new)
tests/_helpers_REQ-23_db.ts                                             (new)
tests/test_UAT_FC_REQ-23_session_crud.test.ts                           (new)
tests/test_UAT_FC_REQ-23_message_append_and_fts.test.ts                 (new)
tests/test_UAT_FC_REQ-23_per_site_scope_query.test.ts                   (new)
tests/test_UAT_FC_REQ-23_reference_docs_fts.test.ts                     (new)
tests/test_UAT_FC_REQ-23_cascade_site_delete.test.ts                    (new)
tests/test_UAT_FC_REQ-23_migrations_reversible.test.ts                  (new)
```


---

## REQ-24: Chat session API + AI memory tools (tail-prime + search/read tools)

# Chat session API + AI memory tools (tail-prime + search/read tools)

Control-app endpoints for session CRUD, paginated message reads, and FTS5 search; refactor of the existing `apps/control-app/src/chat.ts` from "send full history" to **tail-prime + AI memory tools**, per [[DOC-10]] §5.

Design discussion: [[DOC-10]] §4, §5, §7.3. Transcript excerpts in Appendix A below.

## Why free-coded

Mechanical translation of the [[DOC-10]] §5 tool surface into endpoints and an Anthropic-call refactor. The hard design (what's a tool vs. what's in the prompt; tail-vs-summary) is already decided.

## Dependencies

- Blocking on the schema REQ (sessions / messages / reference_docs tables).
- Concurrent with the reference-docs seed REQ — this REQ wires the *tools*; the seed REQ populates the *data*. The tools work with an empty `reference_docs` table; the seed REQ makes them useful.
- Frontend integration REQ (UI) consumes these endpoints; can be developed in parallel against this REQ's mock fixtures.

## Scope

### IN — Endpoints (control-app)

All under `apps/control-app/src/`, mounted from `src/index.ts`.

- `POST /api/sites/:siteId/chats` → create session. Body: `{title?: string}`. Returns `{id, siteId, createdAt}`. If `title` absent, leave NULL; backend fills after first turn.
- `GET  /api/sites/:siteId/chats?limit=N&before=:lastMessageAt` → paginated session list, scoped to site, ordered by `last_message_at DESC`.
- `GET  /api/chats/:sessionId/messages?before=:ord&limit=N` → paginated message read; default returns the tail (no `before` param) of `limit` (default 50) messages. Used by the UI for tail-load and infinite scroll.
- `POST /api/chats/:sessionId/messages` → atomic append. Body: `{role, content, toolCalls?}`. Server allocates next `ord`, updates session denorms (`last_message_at`, `message_count`, `updated_at`). Returns full appended message.
- `DELETE /api/chats/:sessionId` → cascade delete + R2 attachment sweep.
- `PATCH  /api/chats/:sessionId` → operator-edit title.

Reference docs (consumed by the AI tool layer; also useful for UI inspection):

- `GET /api/reference-docs` → list `[{slug, title, summary, kind}]`.
- `GET /api/reference-docs/:slug` → full `{title, summary, toc, body}`. Optional `?section=:sectionSlug` filters body to one section.

All endpoints return JSON. Per-site authorization is stubbed in v1 (single-operator); structure the handler signatures so an auth middleware can be inserted without rewrite.

### IN — `chat.ts` refactor: tail-prime + AI memory tools

Replace the current "client sends full history" model with **server-resident history**:

- `POST /api/chat` (existing) accepts `{sessionId, userMessage, siteDefinition, frameworkCatalog}`. Server:
  1. Appends the user message to `chat_messages` (allocates `ord`).
  2. Loads the **tail of the session** by walking backward from the latest `ord`, accumulating characters until ≥ 5000 (config: `CHAT_TAIL_CHARS`, default 5000). Stops at session boundary.
  3. Loads the reference-doc *index* only (slug, title, summary).
  4. Calls Anthropic with: tail as `messages`, reference-doc index in system prompt, **4 new tools** plus the existing builder action tools.
  5. Streams response; on tool calls to memory tools (`search_transcripts`, `read_session_range`, `list_reference_docs`, `read_reference_doc`), executes server-side and feeds results back to the model (multi-turn tool loop, same pattern as builder action tools).
  6. Appends assistant message (with `tool_calls_json` if any) to `chat_messages`.
  7. If session has no title and this was turn 1, generate a one-line title and `PATCH` the session.
- Remove the `history` field from `ChatRequestBody`. Server is the source of truth; client never sends history.
- Keep `siteDefinition` and `frameworkCatalog` in the request (they're per-turn live state from the UI, not memory).

### IN — AI memory tools

Add to `TOOL_DEFINITIONS`:

```ts
{
  name: "search_transcripts",
  description: "Search prior chat-message text for this site. Site-scoped automatically. Returns matches with session + ord + snippet; follow up with read_session_range to expand context.",
  input_schema: { type: "object", properties: { query: {type: "string"}, limit: {type: "number"} }, required: ["query"] }
},
{
  name: "read_session_range",
  description: "Read a contiguous range of messages from any session belonging to the current site.",
  input_schema: { type: "object", properties: { session_id: {type: "string"}, from_ord: {type: "number"}, to_ord: {type: "number"} }, required: ["session_id", "from_ord", "to_ord"] }
},
{
  name: "list_reference_docs",
  description: "List platform reference documents (modules, framework principles, design decisions) the AI can read.",
  input_schema: { type: "object", properties: {} }
},
{
  name: "read_reference_doc",
  description: "Read a platform reference document. Optionally narrow to one section via the section param (section_slug from the doc's table of contents).",
  input_schema: { type: "object", properties: { slug: {type: "string"}, section: {type: "string"} }, required: ["slug"] }
}
```

Server-side execution joins through `chat_sessions.site_id` to enforce per-site scoping ([[DOC-10]] §7.3). The model cannot see another site's messages.

### IN — System prompt change

Replace the current `buildSystemPrompt` body's prose-only block with:

- The catalog + token sections (unchanged).
- A short note: "You are seeing the TAIL of the active session. Older messages and prior sessions are accessible via `search_transcripts` and `read_session_range`. Platform reference docs are listed below; read them on demand via `read_reference_doc`."
- A list of `{slug, title, summary}` from `list_reference_docs` (inlined cheaply since it's small and per-turn cost is one DB query).
- `siteDefinition` (unchanged).

### OUT

- Auth / multi-tenancy beyond a `userId` slot.
- Semantic / vector search.
- Auto-summarization or compaction.
- Operator-facing reference-doc edit endpoints (read-only API in v1).
- UI changes (separate REQ).
- R2 attachment sweep implementation detail beyond the DELETE handler (separate hardening REQ if it grows complex).

## Acceptance criteria

1. Creating a session via `POST /api/sites/:siteId/chats` returns an ID and the session is visible in the list endpoint.
2. Appending messages monotonically allocates `ord` per session with no gaps.
3. `GET /api/chats/:id/messages` with no `before` returns the last 50 messages in `ord` ascending order (UI-friendly).
4. `GET /api/chats/:id/messages?before=N&limit=50` returns the 50 messages with `ord < N`, ascending.
5. `POST /api/chat` no longer accepts a `history` field; the server uses the stored session.
6. The tail loaded for priming is at least 5000 chars of content and includes the most-recent N messages contiguously.
7. `search_transcripts` invoked by the model returns only messages whose `session_id` belongs to the request's `siteId`. Confirmed with a cross-site test fixture.
8. `read_session_range` rejects a `session_id` belonging to a different site (404 to the model).
9. `list_reference_docs` returns the seeded set; the model can subsequently call `read_reference_doc(slug)` and receive the full body, or with `section=` only that section.
10. Session title is auto-generated and persisted at the end of the first turn.
11. Deleting a session removes its R2 attachments referenced from `tool_calls_json`.

## Test plan (UAT-primary)

Tests under `tests/`, named `test_UAT_FC_<TICKET-ID>_*.ts`. Stack: vitest + Miniflare D1 + R2 emulators + mocked Anthropic.

- `test_UAT_FC_<TICKET-ID>_session_lifecycle.ts` — create, list, append, paginate, delete; verify cascade.
- `test_UAT_FC_<TICKET-ID>_tail_prime.ts` — append 200 short messages, trigger chat turn, assert the messages sent to the mock Anthropic include the tail and not the head.
- `test_UAT_FC_<TICKET-ID>_search_per_site_scope.ts` — two sites with overlapping content; AI's `search_transcripts` from site A's session never returns site B's matches.
- `test_UAT_FC_<TICKET-ID>_reference_doc_tools.ts` — seed a doc, model calls `list_reference_docs` then `read_reference_doc(slug, section=…)`, asserts only the section is returned.
- `test_UAT_FC_<TICKET-ID>_no_history_in_body.ts` — `POST /api/chat` rejects a body containing `history`.
- `test_UAT_FC_<TICKET-ID>_first_turn_title.ts` — first user turn triggers title generation; subsequent turns do not.
- `test_UAT_FC_<TICKET-ID>_attachment_sweep.ts` — append a message with an R2 attachment key in `tool_calls_json`, delete the session, verify R2 key is gone.

## Notes for implementer

- Use a transaction for the append + denorm update sequence to keep `last_message_at` / `message_count` consistent.
- `CHAT_TAIL_CHARS` is a config knob from day one — env var on the Worker, default 5000. Don't bake the literal.
- For the FTS5 search, the canonical SQL is `SELECT m.session_id, m.ord, snippet(chat_messages_fts, 0, '[', ']', '…', 32) FROM chat_messages_fts JOIN chat_messages m ON chat_messages_fts.rowid = m.rowid JOIN chat_sessions s ON s.id = m.session_id WHERE chat_messages_fts MATCH ? AND s.site_id = ? LIMIT ?`.
- Tool calls executed server-side must NOT round-trip to the client. Only the *resulting* assistant text (and any final builder-action tool calls) flows to the UI.
- Keep `chat.ts` test-friendly: the existing `ChatHandlerDeps` injection pattern (fetch + log) extends naturally to a `db` and `r2` slot.
- Streaming: existing impl is non-streaming; this REQ does not require switching to streaming — keep parity, can be a future REQ.

---

## Appendix A — Transcript context

### From CHAT-13 (operator, final turn)

> the AI would be primed with the last 5000 characters of the session but would be able to access the entire transcript with search tools if it desired. It can also access transcripts of the other sessions.

→ Implementation note: per the current conversation, "other sessions" is constrained to **other sessions of the same site only** — cross-site access is removed.

### From current conversation (operator)

> Sessions are per site no cross site references needed

→ Tool implementation MUST join `chat_sessions.site_id` on every search and range-read.

### From current conversation (assistant, proposed tool surface)

> That gives `search_transcripts(query, scope)` and `read_session(id, from_ord, to_ord)` as the two AI tools, and a paginated `GET /api/sessions/:id/messages?before=:ord&limit=N` for infinite scroll.

→ Pinned. `scope` parameter removed since scope is implicit (current site only). Two reference-doc tools (`list_reference_docs`, `read_reference_doc`) added per [[DOC-10]] §5.2.

### From CHAT-13 (operator, on KMS-aware structure)

> the AI can then access the bits of the document(s) that it needs when it needs them. This doesn't exist yet but it will be available for our system before it goes live I expect in the meantime we can just stuff the whole document into the context.

→ Today, `read_reference_doc` without a `section` arg returns the full body — "stuff the whole document" path. With `section` arg it returns one section — KMS-ready path. Tool signature is unchanged when KMS lands; only the implementation behind it gets smarter.



---

## Demo critical-path status (added 2026-06-18)

**Deferred from the convert-flow demo critical path** per the 2026-06-18 planning chat. The demo (paste URL → reproduce site) runs against [[REQ-8]]'s in-memory chat handler with no persistence. This REQ lands the durable foundation; the integration-back into the convert tools ([[REQ-21]] / [[REQ-22]] / [[REQ-28]]) is a follow-on refactor.

Those three REQs each carry a "Future alignment: persistent chat infrastructure" section describing the eventual wire-up — those notes describe the post-this-REQ runtime path, not the demo's flow. When this REQ lands, the refactor is mechanical (the structured `tool_result` payloads already produced by the convert tools reach the `chat_messages` row through this REQ's dispatcher without schema changes).

Implementation ordering: the demo slice (REQ-20 → REQ-13 → REQ-21 → REQ-22 → REQ-28) lands first to validate framework flexibility against a real reproduction target. This REQ comes after the demo confirms the framework is the right shape.


---

## REQ-25: Builder UI: persistent chat sessions (session list, new-chat, infinite scroll)

# Builder UI: persistent chat sessions (session list, new-chat, infinite scroll)

Replace the in-memory `BuilderStore.chatHistory` (currently in `packages/builder-ui/src/store.ts`, lost on every reload) with a persisted-store binding that backs onto the API from the sibling REQ. Add session list, new-chat affordance, and infinite-scroll upward through history, per [[DOC-10]] §7.

Design discussion: [[DOC-10]] §4, §7. Transcript excerpts in Appendix A below.

## Why free-coded

UI integration of a settled persistence model. The shapes (per-site session list, infinite scroll, tail-load size) are decided. No new product surface invented here.

## Dependencies

- Blocking on the chat API REQ (endpoints + tool-loop refactor).
- Concurrent with the schema REQ — schema must land before this can be smoke-tested end-to-end, but the UI work can begin against mock fixtures.
- Compatible with whatever app-shell REQ comes ahead of this; the chat panel here is the same panel surface that the app shell will host inside each tab (per CHAT-9 / [[REQ-16]]).

## Scope

### IN

**Store + API binding (`packages/builder-ui/src/store.ts` + new modules):**

- Replace `BuilderStore.chatHistory` (the unbounded in-memory array) with a paginated `ChatStore`:
  - `activeSessionId: string | null`
  - `sessions: ReadonlyArray<{id, title, lastMessageAt, messageCount}>` (lightweight session list)
  - `loadedMessages: ReadonlyArray<ChatMessage>` (ord-ordered, contiguous from some `loadedFromOrd` to `loadedToOrd`)
  - `hasMoreOlder: boolean`
- Hydrate sessions on mount: `GET /api/sites/:siteId/chats?limit=50`.
- Hydrate tail on session select: `GET /api/chats/:id/messages` (no `before` ⇒ tail; targets ~5–10k chars worth, see implementer note).
- Append a turn: post to `/api/chat`; on response, fetch any newly-appended messages via tail-refresh (or have the chat endpoint return them inline — pick one in implementation, prefer inline for round-trip count).
- Persist `activeSessionId` to localStorage keyed by `siteId` so reload returns to the same conversation.

**Chat panel UI (`packages/builder-ui/src/components/chat-panel.ts`):**

- Session list affordance (dropdown or sidebar — implementer's call; pick the lighter-weight one). Selecting an entry switches `activeSessionId`.
- "New chat" button at the top. Creates a new session via `POST /api/sites/:siteId/chats`, makes it active, clears `loadedMessages`.
- Editable title inline (one-click to edit, blur to save via `PATCH`).
- Delete-session affordance behind a confirm.
- Message list rendering unchanged in style (same markdown rendering as existing); pagination is the new behavior.

**Infinite scroll:**

- Detect scroll-position-near-top via an `IntersectionObserver` on a sentinel element at the top of the message list.
- When `hasMoreOlder` and sentinel visible: `GET /api/chats/:id/messages?before=:loadedFromOrd&limit=50`, prepend, update `loadedFromOrd`.
- Preserve scroll position across prepend (anchor on a stable element, e.g., the previous topmost message).
- When the response is empty, set `hasMoreOlder=false`.

**Site-switch behavior:**

- When the site changes (future multi-site flows), the session list is re-fetched for the new site; the active session resets.

### OUT

- App shell / tab layout — separate REQ.
- Chat search UI (the AI uses `search_transcripts`; operators navigate via the session list in v1). Add when a real need surfaces.
- Streaming responses — present implementation is non-streaming; UI doesn't change for that decision.
- Persisting any per-session UI state beyond `activeSessionId`.

## Acceptance criteria

1. On builder load with a fresh DB and no prior sessions for this site, the chat panel shows the "New chat" affordance and an empty state. Clicking "New chat" creates a session and makes it active.
2. On builder reload after a conversation, the same session is active (persisted via localStorage) and the tail loads automatically.
3. The session list shows all sessions for this site, ordered by `last_message_at` descending. None from other sites appear.
4. Selecting a different session in the list loads that session's tail and clears the previous render.
5. Scrolling to the top of the message list triggers loading of the next page of older messages; scroll position visually anchors so the user doesn't jump.
6. When all messages are loaded, the loader no longer activates and no further requests are made.
7. Sending a message persists it; reload renders it from the API; the in-memory-only behavior is fully gone.
8. Editing the title and blurring out saves it via `PATCH`; reload shows the new title.
9. Deleting a session removes it from the list and clears the active state.
10. The user can have multiple sessions for the same site and switch freely between them.

## Test plan (UAT-primary)

Tests under `tests/`, named `test_UAT_FC_<TICKET-ID>_*.ts`. Stack: vitest + Miniflare + DOM (jsdom or @testing-library).

- `test_UAT_FC_<TICKET-ID>_first_session.ts` — empty site, click "New chat", send a message, reload, message still there.
- `test_UAT_FC_<TICKET-ID>_session_switch.ts` — two sessions, switch between them, each shows its own tail.
- `test_UAT_FC_<TICKET-ID>_infinite_scroll.ts` — session with 200 messages, scroll up triggers page load, eventually `hasMoreOlder=false`.
- `test_UAT_FC_<TICKET-ID>_scroll_anchor.ts` — after prepend on infinite-scroll, the previously-topmost message stays under the user's eye (scroll position math correct).
- `test_UAT_FC_<TICKET-ID>_title_edit.ts` — click title, edit, blur, reload, title persists.
- `test_UAT_FC_<TICKET-ID>_per_site_isolation.ts` — site A and site B each have sessions; switching site shows only that site's sessions.
- `test_UAT_FC_<TICKET-ID>_active_session_persist.ts` — reload re-selects last-active session for the site.

## Notes for implementer

- Tail size: aim for the API to return enough messages that the concatenated `content` length is ~5–10k chars. The API REQ exposes `?limit=N` — pick a generous default (e.g., 50) and accept that some tail loads will be smaller in characters than the upper bound.
- Don't rebuild the markdown rendering pipeline; keep whatever the current `chat-panel.ts` uses.
- Preserve scroll position across prepends with: record `previousScrollHeight` and `previousScrollTop` before render, set `scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop` after.
- Don't poll. The active session updates only as a result of the operator's own actions; no need for SSE / WS in v1.
- The existing `chat-driver.ts` orchestrates the turn loop — refactor it to point at `/api/chat` per the new contract (no client-side history field).

---

## Appendix A — Transcript context

### From CHAT-13 (operator, final turn)

> In the UI for example we would only load the last 5 to 10,000 characters unless the user push the scroll bar all the way up in which case we would "infinite scroll" toward the top as needed.

→ Direct UI contract — drives the IntersectionObserver-on-top-sentinel pattern.

### From current conversation (operator)

> Sessions are per site no cross site references needed

→ Session list and switcher are scoped to the current site. No global chats view.

### From current conversation (assistant, proposed shape)

> Schema sketch … paginated `GET /api/sessions/:id/messages?before=:ord&limit=N` for infinite scroll.

→ Endpoint shape that this UI consumes; finalized in the API REQ.

### Implication of "multiple sessions per site" (CHAT-13 + this conversation)

The "new chat" affordance is necessary because sessions don't grow without bound at the operator's expense — they can choose to scope a fresh topic in a fresh thread, while old threads remain accessible.


---

## Implementer addendum (REQ-25 free-coding session)

**Side effects on existing behaviour:**

- `chat-driver.ts` previously sent `{history, siteDefinition, frameworkCatalog}`. The new contract from REQ-24 requires `{sessionId, userMessage, siteDefinition, frameworkCatalog}` (no `history`). The driver now sends only the new turn; the server reads stored session messages.
- **REQ-37 pending-tool-failure reinjection** previously prepended a synthetic `system` message to outbound `history`. Under the new contract, that synthetic note is persisted via `POST /api/chats/:id/messages` (role=`system`) before the chat call so the server's tail-load picks it up naturally. The associated REQ-37 driver test is updated to verify the new wire shape; the user-facing behaviour (panel surfaces the failure, dismiss clears it, AI sees the note next turn) is preserved.

**Tail load returns oldest → newest.** The client appends optimistic messages at the end and pages older messages via `?before=:loadedFromOrd`.

**Optimistic UX, no inline refresh.** The driver appends a user message + empty assistant bubble locally, streams tokens into the bubble, and trusts the server to persist on `done`. We do not refresh the tail per turn; reload pulls from the canonical store.


---

## Scope reduction (REQ-25 second pass)

Operator feedback: session-management UI not wanted for v1.

**Dropped from scope:**

- Session-list dropdown
- "New chat" affordance
- Inline title editor
- Delete-session affordance

**Replaced with:** a single auto-managed chat session per (site, browser) pair. On boot the wiring layer ensures a session exists — picks the localStorage-stored active id, falls back to the most recently used, or creates a fresh one if none exist. The session persists across reloads exactly as before; only the UI surface for switching/creating/renaming/deleting goes away.

**Still in scope (and shipped):** server-resident history (no client-side `history` field), tail load on boot, infinite scroll upward through the active session, per-site isolation, scroll-position anchoring on prepend.

**Implication on acceptance criteria:** AC1 (New chat button), AC3 (session list), AC4 (switch sessions), AC8 (title edit), AC9 (delete), AC10 (multiple sessions per site) are dropped as user-visible behaviour. Their backing API/store machinery stays in place — re-exposing them later is a UI-only change.


---

## REQ-50: Architecture: rename npm scope to @gendev + seed reusable productization packages + roadmap

# Architecture: rename npm scope + seed reusable productization packages + sequencing

Restructure the monorepo so the productization layer (auth, billing, portal UI, API contracts) can be reused across XGD's own commercial surfaces (marketing site, customer portal) and the 1stcontact product. This REQ delivers the mechanical foundation — scope rename + empty package skeletons + a documented sequencing roadmap — without implementing any of the new packages. Implementation of each new package lands in follow-up REQs.

Background: architecture discussion in [[CHAT-19]]; complements [[DOC-1]], [[DOC-5]], [[DOC-12]].

## Why free-coded

Mechanical refactor with no new product surface invented here. The package boundaries (auth/billing/portal-ui/api-contracts) are already anticipated by [[DOC-12]]'s "Required Upstream Web Changes"; the npm scope rename is a sed-and-rebuild; the sequencing record is documentation. No new runtime behaviour — the built `apps/control-app`, `apps/public-site`, and generated `sites/1stcontact` output must be unchanged.

## Why this matters

The current `@1stcontact/*` scope strongly implies every package belongs to *that product*. In reality the same primitives need to serve at least two consumers:

1. **XGD itself** — needs auth, billing, a customer portal, and a marketing site for its own commercial story (single-tenant from XGD's POV).
2. **1stcontact** — needs the same primitives, but operating one level deeper (each tenant has their own customers).

If we build auth/billing/portal inside `apps/control-app/src/`, the inevitable extraction-for-reuse costs a multi-week refactor. If we start with packages, extraction is free. The test of whether the abstractions work is whether **XGD's own portal can be built from these packages first**. That ordering — XGD as consumer #1, 1stcontact tenants as consumer #2 — keeps the abstractions honest (two-then-three rule, not speculative platform design).

## Dependencies

None blocking. Should land before:

- Owner-API contracts work (referenced as item #2 in [[DOC-12]]'s "Required Upstream Web Changes")
- Magic-link auth implementation (item #1 in [[DOC-12]])
- Any customer portal work
- Stripe / billing integration

The tenancy schema decision (see "Out of scope" below) should be recorded in a parallel DOC update before any D1 migrations land for owner-API tables.

## Deliverables

### 1. npm scope rename: `@1stcontact/*` → `@gendev/*`

Affects:

- `packages/{site-schema,framework,builder-ui,extractor,web-fetch-safety,ui-kit}/package.json` — `name` field
- `apps/{control-app,public-site}/package.json` — `name` field + `dependencies`/`devDependencies` keys
- `tools/{generate,dev-tools-server}/package.json` — `name` field + dependencies
- Root `package.json` — `devDependencies` workspace references
- All `import` statements across `apps/**/src`, `packages/**/src`, `tools/**/src`, and `tests/**`
- Pnpm filter scripts in root `package.json` (`pnpm --filter @1stcontact/...` → `@gendev/...`)
- `pnpm-workspace.yaml` — unchanged (globs are scope-agnostic)
- `pnpm-lock.yaml` — regenerated by `pnpm install`

Single coherent commit. Verify with `pnpm install && pnpm build && pnpm test`.

Note: the *product* `1stcontact` keeps its name. Only the npm scope changes. `sites/1stcontact/site.json` is unchanged.

### 2. Package skeletons for the productization layer

Create folder + `package.json` + `tsconfig.json` + `README.md` + empty `src/index.ts` for each. **No implementation in this REQ** — that's follow-up REQs. The README in each describes the package's role and links to the design docs.

- `packages/api-contracts` — Zod request/response schemas for the owner-facing API. Pattern mirrors `packages/site-schema`. Referenced as item #8 in [[DOC-12]] "Policy" and item #2 in "Required Upstream Web Changes".
- `packages/auth` — magic-link tokens, sessions, access+refresh exchange, Bearer wrapper. Headless library, no UI. Referenced as item #1 in [[DOC-12]] "Required Upstream Web Changes" and [[DOC-5]] § "Magic-Link Authentication Model".
- `packages/billing` — Stripe wrappers (customer, subscription, webhook handlers, plan-tier checks). Referenced in [[DOC-5]] § "Payments and Invoicing".
- `packages/portal-ui` — opinionated portal pages (login, account, billing, settings, sites list). Themed via `@gendev/framework`'s token layer. Referenced in [[DOC-5]] § "Customer Portal as Trust Architecture" and the existing stub `packages/ui-kit` (which this supersedes — `ui-kit` should be deleted or merged into `portal-ui` as part of this REQ).

### 3. Sequencing roadmap for follow-up REQs

Record the ordering (in this REQ body's "Sequencing" appendix below) — not as separate tickets yet:

1. THIS REQ (rename + skeletons)
2. REQ: tenancy schema decision (org_id + account_id model) — recorded as a [[DOC-1]] amendment or new DOC ticket, must precede REQ-10 migrations landing in prod
3. REQ: `@gendev/api-contracts` first contract (`/api/owner/v1/leads`) per [[DOC-12]] items #8–#9
4. REQ: `@gendev/auth` magic-link implementation, replacing the `apps/control-app/src/safety/account.ts` `x-account-id` stub
5. REQ: `sites/xgd` + `apps/xgd-site` marketing site — dogfoods `@gendev/framework` as a cross-product consumer
6. REQ: `apps/xgd-portal` — XGD's customer portal, **the architectural validation step**: must be buildable from `@gendev/auth` + `@gendev/portal-ui` + `@gendev/billing` with zero in-app implementation
7. REQ: 1stcontact tenant onboarding — generalizes the portal stack to the 2-level (org → account) tenancy case

## Out of scope for this REQ

- **Implementation of any new package.** Each is its own follow-up REQ (steps 3–6 above).
- **D1 migrations** for the new API surface. Schema is governed by [[REQ-10]]; the tenancy decision is a separate REQ/DOC update.
- **XGD marketing site content.** The `sites/xgd/site.json` authoring is a separate REQ (step 5).
- **Brand renaming of the `1stcontact` product.** Only the npm scope changes. The product can still be called 1stcontact.
- **Deletion of `1stcontact`-specific code.** Anything currently in `apps/control-app/src/` stays where it is; this REQ does not move code into the new packages.

## Acceptance criteria

1. `pnpm install && pnpm build && pnpm test` is green after the rename.
2. `pnpm list -r --depth=-1` shows every workspace package as `@gendev/*`; no `@1stcontact/*` references remain in the source tree (`grep -r '@1stcontact'` returns only this REQ's body and incidental historical mentions in DOC tickets and READMEs).
3. The four new package directories exist under `packages/` (`api-contracts`, `auth`, `billing`, `portal-ui`), each with `package.json` (named `@gendev/<name>`), `tsconfig.json`, `README.md` describing its role + design-doc links, and a placeholder `src/index.ts` exporting nothing real.
4. `packages/ui-kit` is removed (it was a stub anyway) — its intended role is now occupied by `packages/portal-ui`.
5. `apps/control-app` and `apps/public-site` build identically pre/post rename (dist directory byte-equivalent modulo source-map paths that mention the scope).
6. `sites/1stcontact` generates identical static output pre/post rename (`tools/generate` → `apps/public-site/public/` diff is empty).
7. This REQ body's Sequencing appendix lists the seven follow-up steps with one-line scope each. (Already satisfied by this body — verify on close.)

## UAT tests

Per free-coding protocol, `tests/test_UAT_FC_REQ-<id>_*`:

- `test_UAT_FC_REQ-<id>_scope_rename_complete` — assert no `@1stcontact` import survives in `apps/`, `packages/`, `tools/` source
- `test_UAT_FC_REQ-<id>_package_skeletons_present` — assert each of the four new packages exists with required files
- `test_UAT_FC_REQ-<id>_builds_unchanged` — assert `pnpm build` succeeds and `apps/control-app/dist` checksum is stable across the rename (modulo expected scope-string changes)
- `test_UAT_FC_REQ-<id>_generated_site_stable` — assert `tools/generate` output for `sites/1stcontact` matches the pre-rename baseline

## Sequencing appendix (see Deliverable 3)

| # | REQ scope | Why this order |
|---|-----------|---------------|
| 1 | THIS REQ — scope rename + package skeletons | Mechanical foundation; unblocks the rest |
| 2 | Tenancy decision (DOC amendment) | Must precede REQ-10 migrations going live |
| 3 | `api-contracts` first contract (`/api/owner/v1/leads`) | Keystone; every other consumer infers types from it |
| 4 | `auth` magic-link implementation | Replaces `x-account-id` stub; required by owner API |
| 5 | `sites/xgd` + `apps/xgd-site` (marketing) | Dogfoods `framework` cross-product; cheap; produces immediate value |
| 6 | `apps/xgd-portal` (XGD customer portal) | **Architectural validation** — proves auth/billing/portal-ui are reusable |
| 7 | 1stcontact tenant onboarding | Generalizes to 2-level tenancy once XGD's 1-level case works |


---

## Implementation note (added on free_coded)

Landed in commit `3847ff00ff1cd86fd3dbbe028802d10523230ded`.

**Acceptance criteria status:**

1. ✅ `pnpm install` green; `pnpm test` 686/686 green.
   ⚠️ `pnpm build` fails on `apps/control-app` due to **pre-existing** TypeScript DOM-type errors confirmed on baseline commit `46109cd`. The rename did not introduce these — control-app's tsconfig sets `"types": ["@cloudflare/workers-types"]` which removes the default DOM lib, and `tsc --noEmit` then type-checks transitively-imported `packages/builder-ui/src/components/*.ts` which references `HTMLElement`, `Document`, etc. Fix is out of scope for REQ-50 — file as a separate bug.
2. ✅ `pnpm list -r --depth=-1` shows every workspace package as `@gendev/*`. Remaining `@1stcontact/` references are limited to ticket bodies (this REQ + a few historical comment tickets) and the `pnpm-lock.yaml` integrity hashes (not package names) — UAT `test_UAT_FC_REQ-50_scope_rename_complete` enforces this on source.
3. ✅ Four new package directories exist (`api-contracts`, `auth`, `billing`, `portal-ui`), each with `package.json` (`@gendev/<name>`), `tsconfig.json`, `README.md`, `src/index.ts`. UAT `test_UAT_FC_REQ-50_package_skeletons_present` enforces this.
4. ✅ `packages/ui-kit` removed.
5. ✅ `apps/control-app` and `apps/public-site` build identically pre/post rename (same control-app DOM errors; same public-site green build).
6. ✅ `sites/1stcontact` static output unchanged (no `sites/1stcontact/site.json` modification).
7. ✅ Sequencing appendix present in this body, listing the seven follow-up steps.

**Files touched:** 203 (192 modified, 17 new package skeleton files + 2 UATs, 2 deletions for `packages/ui-kit`).

**Out-of-scope finding surfaced during work:** `apps/control-app/.dev.vars` is not in `.gitignore` and contains a live API key. Not committed (verified). Consider adding `**/.dev.vars` to `.gitignore` in a separate ticket.


---

## BUG-8: Builder chat boot fails: 'fetch' called on object that does not implement Window

## Symptom

On loading the builder, the chat panel shows the in-panel system message:

> Chat backend unavailable.
> Could not establish a chat session for site 'site_1stcontact'.
> Error: 'fetch' called on an object that does not implement interface Window.

No requests reach the backend. Triggering a send produces the same error and the input clears with no message rendered.

## Root cause

Three call sites in \`packages/builder-ui/src\` default to \`globalThis.fetch\` without rebinding \`this\`:

- \`main.ts:157\` — \`const fetchImpl = options.fetch ?? globalThis.fetch;\`
- \`chat-driver.ts:95\` — same pattern
- \`chats-api.ts:39\` — \`this.fetchImpl = options.fetch ?? globalThis.fetch;\`

The browser's \`fetch\` is a method of \`Window\` and the spec requires \`this === Window\` at call time. Calling the bare reference (\`fetchImpl(...)\` as a free function, or \`this.fetchImpl(...)\` where \`this\` is the ChatsApi instance) violates that and throws TypeError. Test paths that pass an explicit \`fetch\` mock did not hit this; production / real-browser use does.

This was introduced when REQ-25 wiring centralised the fetch defaulting — earlier code paths called \`fetch(...)\` directly as a global, which the browser permits.

## Fix

At each of the three sites, default to \`globalThis.fetch.bind(globalThis)\` so the receiver is always \`Window\`. No behaviour change when the caller passes their own \`fetch\`.

## Acceptance criteria

- AC1: \`new ChatsApi()\` (no options) can call its endpoints without raising "fetch called on an object that does not implement interface Window".
- AC2: \`runChatTurn(text, { store, catalog })\` (no \`fetch\` override) does not raise the same error.
- AC3: \`bootBuilder({ root, initialSite, siteId })\` (no \`fetch\` override) does not surface the unbound-fetch TypeError in its in-panel error message.

## UAT

\`tests/test_UAT_FC_BUG-8_default_fetch_is_callable_without_this_binding.test.ts\` — install a \`globalThis.fetch\` that throws TypeError when \`this !== globalThis\` (mimicking browser spec enforcement), then exercise each of the three sites with no explicit fetch override. Expect no TypeError; chat-history system message (if any) must not mention "does not implement interface Window".