---
uid: comment-2ad991f7
id: COMMENT-143
type: comment
title: Comment on bug BUG-8
created_by: xgd
created_at: '2026-06-24T19:58:54.220925+00:00'
updated_at: '2026-06-24T20:06:39.776147+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-8f5b696e
  kind: chat_transcript
---

<!-- xgd-turn id="a97a3125-d602-4ace-9543-dfac709b5d0f-user" -->

<!-- xgd-chat role="user" ts="2026-06-24T19:58:44.336Z" -->
#### You
The chat panel is swallowing chat inputs and displaying nothing

<!-- xgd-turn id="a97a3125-d602-4ace-9543-dfac709b5d0f-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-24T20:00:48.198Z" -->
#### Claude
I'll investigate the chat panel issue and help scope this ticket properly. Let me first check the current ticket state and find the relevant code.

Let me look at the wiring layer and store to understand the data flow before asking the user clarifying questions.

I've looked at the chat panel and the chat-driver — they're the two pieces that handle "operator types → message appears in chat list → assistant response renders." Before I dig deeper or scope the ticket, I need to disambiguate what "swallowing" means here, since the fix paths are different.

Let me investigate the wiring layer directly — the recent session-management refactor could be at fault.

I found the likely root cause without needing further input. Here's the diagnosis:

**The race**: `main.ts` boots in two parallel paths:

1. **Boot promise** (`main.ts:283-290`): fires `ensureActiveSession` → `loadAndActivate` → `store.setActiveSession(...)`, which **replaces** `chatHistory` wholesale with the server's tail.
2. **onSend handler** (`main.ts:217-251`): if the operator sends before boot finishes, it runs its *own* `ensureActiveSession` + `loadAndActivate`, then `runChatTurn` appends the user bubble and an empty assistant bubble.

If the boot promise resolves *after* the user has sent their first message, its `setActiveSession` wipes the freshly-appended bubbles. Subsequent `token` SSE events hit `store.updateLastChatMessage`, which is a silent no-op when `chatHistory.length === 0` (`store.ts:166-168`). End result: input clears, nothing renders, no error. Exactly "swallowing inputs and displaying nothing."

**Proposed fix**: share a single boot promise. `onSend` awaits it instead of running its own ensure/load. Removes the race entirely; also removes the duplicated `ensureActiveSession`/`loadAndActivate` block in `onSend`.

**Proposed ticket scope**:

- **Title**: `Builder chat: race between boot session-load and first send swallows messages`
- **Symptom**: Operator types and sends a message immediately on page load. Editor clears, no user bubble appears, no assistant response, no error.
- **Root cause**: `main.ts` boot promise and `onSend` both call `setActiveSession`; the boot path can fire after the user's message has been appended and wipe it. Streaming `updateLastChatMessage` then no-ops silently.
- **Fix**: single shared `bootPromise`; `onSend` awaits it; remove redundant ensure/load from `onSend`.
- **Test**: `test_UAT_FC_BUG-8_first_send_during_boot_is_not_swallowed` — boot with a slow `ensureActiveSession` (deferred promise), call `onSend` before boot resolves, assert the user message survives and the assistant bubble grows on streamed tokens.

Want me to proceed with this scope — write it into BUG-8 (preserving the `(new ticket)` placeholder context) and then implement the fix and UAT? Or does the symptom you saw differ from what I described (e.g. it happens every time, not just on first load)?

<!-- xgd-turn id="ab4ea277-ebf6-4241-a0d5-a1da787acdb7-user" -->

<!-- xgd-chat role="user" ts="2026-06-24T20:02:26.042Z" -->
#### You
I see this message after restart: Chat backend unavailable. Could not establish a chat session for site 'site_1stcontact'. Error: 'fetch' called on an object that does not implement interface Window. If running locally, apply the chat-table migrations: wrangler d1 migrations apply 1stcontact-sites --local

<!-- xgd-turn id="ab4ea277-ebf6-4241-a0d5-a1da787acdb7-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-24T20:02:59.834Z" -->
#### Claude
That's a clearer signal — the error tells us exactly what's broken. `'fetch' called on an object that does not implement interface Window` is the classic **unbound fetch** error: you reference `globalThis.fetch` and call it later, but the browser's `fetch` requires `this === window`.

Let me confirm the source.

Confirmed — three sites all do `options.fetch ?? globalThis.fetch`, capturing an unbound reference. In Chromium/Firefox the spec requires `fetch` to be called with `Window` as `this`; the captured reference is naked, so `fetchImpl(...)` throws exactly the error you pasted.

- `packages/builder-ui/src/chats-api.ts:39`
- `packages/builder-ui/src/chat-driver.ts:95`
- `packages/builder-ui/src/main.ts:157`

The fix in all three: `options.fetch ?? globalThis.fetch.bind(globalThis)`.

**Revised BUG-8 scope** (replaces my earlier race-condition theory — that's a real but latent issue masked by this one; not for this ticket):

- **Title**: Builder chat boot fails with "fetch called on object that does not implement interface Window"
- **Symptom**: On builder load, chat panel shows the "Chat backend unavailable" system message with that error. No requests reach the backend.
- **Root cause**: Three sites destructure `globalThis.fetch` without binding `this`. The browser's `fetch` rejects calls whose `this` is not `Window`.
- **Fix**: Default to `globalThis.fetch.bind(globalThis)` at each site.
- **UAT**: `test_UAT_FC_BUG-8_default_fetch_is_callable_without_this_binding` — invoke `bootBuilder` / `new ChatsApi()` / `runChatTurn` with `options.fetch` omitted in a jsdom env where `globalThis.fetch` is a `Window`-bound function that throws on bad `this`; assert no `TypeError` is raised.

Going ahead with: scope BUG-8 body → write UAT → fix three sites → commit `[FREE-CODED]` → set `status=free_coded` + `fields.commits=[sha]`. Confirm and I'll start.

<!-- xgd-turn id="5df9c007-4055-420a-951a-0f466ee27348-user" -->

<!-- xgd-chat role="user" ts="2026-06-24T20:06:33.263Z" -->
#### You
go ahead

<!-- xgd-chat-end -->