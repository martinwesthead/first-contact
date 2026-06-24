---
uid: comment-2ad991f7
id: COMMENT-143
type: comment
title: Comment on bug BUG-8
created_by: xgd
created_at: '2026-06-24T19:58:54.220925+00:00'
updated_at: '2026-06-24T20:00:48.200013+00:00'
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

<!-- xgd-chat-end -->