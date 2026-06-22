---
uid: comment-903627f9
id: COMMENT-136
type: comment
title: Comment on request REQ-25
created_by: xgd
created_at: '2026-06-22T18:08:26.910800+00:00'
updated_at: '2026-06-22T18:09:31.561525+00:00'
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

<!-- xgd-chat-end -->