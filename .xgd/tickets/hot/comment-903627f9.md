---
uid: comment-903627f9
id: COMMENT-136
type: comment
title: Comment on request REQ-25
created_by: xgd
created_at: '2026-06-22T18:08:26.910800+00:00'
updated_at: '2026-06-22T23:17:12.195451+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-6f244e88
  kind: chat_transcript
---

<!-- xgd-turn id="0ab615cb-f3fd-4d90-a1b9-cff1e10f552b-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T18:07:54.588Z" -->
#### You
Please read this ticket and let me know if you understand it well enough to free code it. In particular I want to check in on context size - when the chat session grows too big the responses slow and fail. In XGD we had a very simple fix - once context exceeds a limit we start a new session seeded with (1) essential docs and (2) the last part of the transcript that has grown too big (3) a tool is provided to let the AI read the session in case it needs to refer to aspects. How much of this ware we implementing? Perhaps this is a new ticket?

<!-- xgd-turn id="0ab615cb-f3fd-4d90-a1b9-cff1e10f552b-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-22T18:09:31.558Z" -->
#### Claude
Let me check the related tickets to give you a clear picture.

I've read REQ-25 carefully and dug into the related tickets. Here's the picture:

## What REQ-25 covers (and what it doesn't)

REQ-25 is **pure UI binding** — session list dropdown, "new chat" button, infinite-scroll-upward through history, persisting `activeSessionId` to localStorage. It explicitly does **not** implement any context-size management. The ticket's "OUT" section lists `Chat search UI` and `Streaming responses` as out-of-scope, and the AI-side handling is also out of its scope by design.

## Where your concern actually lives: REQ-24

The context-overflow problem is REQ-24's territory — **"Chat session API + AI memory tools (tail-prime + search/read tools)"**. It's currently `draft` and unimplemented.

Compared to your XGD-style fix:

| Your XGD model | DOC-10 / REQ-24 model |
|---|---|
| Auto-rollover to new session at limit | Single session grows forever |
| Seed with essential docs | Reference-doc *index* (slug + 1-line summary) inlined; bodies fetched via `read_reference_doc` tool |
| Seed with tail of transcript | Server walks back ~5000 chars from latest `ord` each turn ("tail-prime") |
| Tool to read session | `search_transcripts` (FTS5) + `read_session_range` tools |

Net effect is the same — bounded per-turn context, AI can reach further via tools. The mechanism differs: no automatic rollover; one session grows unboundedly on disk and the operator can *manually* start a new chat via the "new chat" button (which is REQ-25's job).

## Whether a new ticket is needed

**No new ticket needed.** REQ-24 already specifies exactly what you're describing (with one design choice variation — tail-of-current-session instead of new-session-with-tail-seed). The "essential docs" piece is REQ-26 (reference docs library + seed).

## Can I free-code REQ-25 now?

**Not cleanly.** REQ-25 explicitly says: *"Blocking on the chat API REQ (endpoints + tool-loop refactor)"* — that's REQ-24. And REQ-24 needs REQ-23 (D1 schema). I checked: neither is implemented. Current state is exactly what REQ-25 describes (in-memory `chatHistory` in `store.ts:50`).

So the realistic options:

1. **Implement REQ-23 + REQ-24 + REQ-25 as one bundle** (much larger — schema + endpoints + tool-loop refactor + UI). Story points combined would be ~14.
2. **Do REQ-23 + REQ-24 first** (separately), then REQ-25 lands cleanly on top.
3. **Stub the API in apps/control-app and do just REQ-25** — the UI works, but nothing actually persists. Probably not what you want.

Which direction would you like? My recommendation is **option 2** (REQ-23 + REQ-24 first as their own sessions, then REQ-25 after) — it matches the dependency chain in the ticket bodies and keeps each bundle's reconcile scope small.

<!-- xgd-turn id="f55ac0e4-086d-4638-9f64-826122ec805b-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T20:10:05.064Z" -->
#### You
ok 23 and 24 are done - can you go ahead and free code this please?

<!-- xgd-turn id="f55ac0e4-086d-4638-9f64-826122ec805b-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-22T20:29:11.928Z" -->
#### Claude
Let me verify REQ-23/REQ-24 status and understand the current API surface before I start.

Let me set up tasks and look at existing tests for patterns before diving in.

Now I have enough context. Let me update the ticket scope, then start building.

Now let me create the chats-api module.

Now extend the store with session state and methods.

Now add session-management methods. Let me look at the current method shape first.

Now refactor the chat-driver to use sessionId and persist failure notes via the API.

Now the body of `runChatTurn`. Replace the history-prepend-and-send logic with sessionId+userMessage.

Now the chat panel — add session controls and infinite scroll.

Now add the session-bar DOM construction and the supporting logic. Let me insert it just after the existing tool-pane header block.

Now hook session bar into the root, add the top sentinel inside messageList, and wire up handlers.

Now adjust `renderMessages` to keep the sentinel and add the session-bar / scroll-anchor logic. Find the rendering section.

Now wire the session-bar interactions and IntersectionObserver. Find the subscribe and insertion points.

Now add the helper and update the return statement and destroy.

Now wire main.ts to hydrate sessions, restore active, handle the lifecycle.

Let me typecheck the package to catch any errors before going further.

Clean. Now let me update the broken existing tests (REQ-37 driver test) and verify other tests still build.

Now update the REQ-37 driver test that depends on the old `history` contract.

Now let me write the REQ-25 UAT tests. First a helper to stub the chat HTTP surface.

Now write the UAT tests for REQ-25. I'll start with tests that exercise the ChatsApi + store directly (covering most ACs without touching the full DOM).

Now let me run typecheck on everything and the test suite.

All 11 REQ-25 UAT tests pass. Let me also run the existing chat-related tests to confirm nothing broke.

All 96 adjacent tests pass. Now the full suite + quality gate.

Quality gate green. Now commit and update the ticket.

Done. REQ-25 is `free_coded` at version 0.0.33.

**What landed:**
- `packages/builder-ui/src/chats-api.ts` — typed client for the REQ-24 endpoints.
- `store.ts` — added `activeSessionId`, `sessions`, `loadedFromOrd`, `hasMoreOlder` and the session-management methods (`setActiveSession`, `prependOlderMessages`, upsert/remove session).
- `chat-driver.ts` — POSTs `{sessionId, userMessage, …}` with no `history`. Prior-turn tool failures are persisted via `POST /api/chats/:id/messages` so the server's tail-load picks them up (REQ-37 reinjection adapted).
- `chat-panel.ts` — session bar (select / new / inline title editor / delete), top sentinel + IntersectionObserver for infinite scroll, `withScrollAnchor` primitive that preserves topmost-visible position on prepend.
- `main.ts` — per-site `fc.builder.activeChatSession.<siteId>` localStorage key, hydrates sessions on boot, restores last-active session, refreshes the list after each turn.

**Tests:** 11 new UAT tests under `tests/test_UAT_FC_REQ-25_*` covering all 10 ACs + the wire-contract gate. Adapted 6 existing tests (REQ-8/-34/-36/-37) to the new `sessionId`-driven driver.

**Quality gate:** `xgd quality run --all-tests` → PASS.
**Commits:** `46109cd` (feature) + `3772b3d` (version bump).

<!-- xgd-turn id="4392ea12-3289-4c1d-aa95-cb88e96a4ffa-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T23:09:08.118Z" -->
#### You
1) This should start with an initial session established 
2) the "+ New Chat Session" is broken. TBH I don't need or want session management on the page rightr now I just want a single chat session per tab (only one tab right now) to persist

<!-- xgd-turn id="4392ea12-3289-4c1d-aa95-cb88e96a4ffa-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-22T23:17:12.193Z" -->
#### Claude
Got it — simplify to a single auto-created persisted session per site, no session-management UI. Let me check the current package state first.

Strip the session UI out of chat-panel.

Now strip the renderSessionBar block and all the click handlers, but keep the IntersectionObserver. Let me locate it.

Now strip the dropped fields from the returned handle and remove `sessionLabel`.

Now simplify main.ts.

Good — `@gendev/site-schema` is correct. Now run typecheck.

Now delete the tests that exercise dropped UI, and rewrite the first_session test to verify auto-creation.

All REQ-25 tests pass. Let me also drop the now-unused `ChatSessionSummary` import from store re-export and verify chats-api compatibility.

Let me also trim the dead session-management methods from the store, per project's "no speculative code" rule.

Now find and remove the dead methods `setSessions`, `upsertSession`, `removeSession`.

Now drop the export of `ChatSessionSummary` from the index.

All 89 affected tests pass. Quality gate + commit.

Done. REQ-25 is now `free_coded` at version 0.0.35 with the scope reduction applied.

**What changed in this pass:**
- **chat-panel**: dropped `sessionBar`, `sessionSelect`, `newChatButton`, `titleEditor`, `deleteButton`, and all the click/title/confirm handlers. Only the infinite-scroll hook (`onScrollToTop`) and the `topSentinel` + `IntersectionObserver` remain.
- **main.ts**: new `ensureActiveSession` that picks `localStorage` id → most-recent session → auto-creates one. On boot the operator always has a live session; no empty state, no "click new chat to start".
- **store**: removed the now-unused `ChatSessionSummary` type and `setSessions`/`upsertSession`/`removeSession` methods (no callers after UI removal).
- **tests**: deleted `_session_switch`, `_delete_session`, `_title_edit`; rewrote `_first_session` to cover the two boot paths (auto-create on empty, reuse existing).

**Backing machinery preserved:** The REQ-23 schema and REQ-24 endpoints still support multi-session — re-exposing it later is UI-only.

**Quality gate:** ✅ all-tests pass.
**Commits:** `7e91942` (feature) + `3a5f59d` (bump).

<!-- xgd-chat-end -->