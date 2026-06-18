---
uid: request-bd042463
id: REQ-24
type: request
title: Chat session API + AI memory tools (tail-prime + search/read tools)
created_by: xgd
created_at: '2026-06-16T23:27:02.331402+00:00'
updated_at: '2026-06-18T22:27:27.796903+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: medium
  story_points: 5
  auto_merge_back: true
  needs_review: false
---

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
