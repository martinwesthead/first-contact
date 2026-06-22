---
uid: request-6f244e88
id: REQ-25
type: request
title: 'Builder UI: persistent chat sessions (session list, new-chat, infinite scroll)'
created_by: xgd
created_at: '2026-06-16T23:27:06.916520+00:00'
updated_at: '2026-06-22T20:13:27.329315+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: medium
  story_points: 4
  auto_merge_back: true
  needs_review: false
---

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
