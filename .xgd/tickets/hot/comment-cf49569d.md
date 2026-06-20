---
uid: comment-cf49569d
id: COMMENT-118
type: comment
title: Comment on request REQ-36
created_by: xgd
created_at: '2026-06-20T20:23:05.811361+00:00'
updated_at: '2026-06-20T21:24:39.727765+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-54b60186
  kind: chat_transcript
---

<!-- xgd-turn id="6f7f6ea3-a04a-4454-90ae-2bd51d114f68-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T20:22:54.406Z" -->
#### You
I am feeling pretty frustrated with the chat capability on our product. I asked for a copy of the chat capability on XGD which is specified and implemented on ../xgendev-main. We spent some time honing a beautiful chat window with the right aesthetics and functionality and instead I have a ugly window that was created from scratch and seem to ignore all of the lessons that we learned. Let me give you a list of things that I have noticed already:

Font size is too big. Text entry should have rounded corners and a clear edging. Send button should be a play button and should be round and should be inside the text entry area not outside. Chat window contents and text area contents should display markdown rendering. I think we already have a bug for this last one can you compare these implementations. Oh yes and our chat window has a tool use window at the top of it which shows the tools that are being used as they are being used I don't have that collapses the windo and re expands it to be a double chevron. Can you review the xgendev chat capability and audit the look and feel and functionality please

<!-- xgd-turn id="6f7f6ea3-a04a-4454-90ae-2bd51d114f68-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T20:26:23.824Z" -->
#### Claude
I'll audit both implementations and compare. This is a research task — I'll populate REQ-36 with the findings before any code work begins.

Found both implementations. Let me read the first-contact chat panel and the XGD chat capability in parallel.

Now let me find the chat CSS in the first-contact codebase and the XGD chat HTML.

Now let me examine the XGD chat UI. First find the chat-related sections in their massive HTML file.

Excellent — found the gold. Let me continue and find more.

Now let me look at the chat-tool-header for collapse/expand chevron and the chat widget HTML structure.

Now let me look at the floating chat window (similar to what may be more relevant for first-contact's chat panel) and the tool pane logic.

Now let me check what the bug ticket about markdown rendering says (the user mentioned "I think we already have a bug for this last one").

Now let me check the chat-tool-header behavior and the floating chat window CSS for collapse.

I have enough context to write a comprehensive audit. Let me also check the user's chat input rendering. The user said "chat window contents AND text area contents should display markdown rendering". Let me verify what fc-chat currently does for user-typed messages:

Looking at chat-panel.ts line 144-150: user messages render with `textContent` (plaintext), only `assistant` renders markdown. The TipTap input supports markdown via the Markdown extension, but the message DISPLAY for user messages is plaintext.

Let me also note the user mentioned a bug for markdown rendering. REQ-13 already shipped assistant markdown via marked. Let me verify what's actually rendered for user content and check our chat-driver.

Confirmed — first-contact has NO tool-use pane concept at all. Each tool call's result is rendered inline in the chat message. The XGD pattern is a distinct collapsible pane at the top of the chat with a chevron header.

Now I have enough to draft the audit. Let me populate the ticket.

REQ-36 is now populated. Here's the audit summary:

## Audit: first-contact builder chat vs XGD reference

**Reference**: `../xgendev-main/xgd_source/dashboard/static/index.html` (CSS at L3902-4500, HTML at L5197-5231 / L5629-5635, JS at L17840-17911)
**Current code**: `packages/builder-ui/src/components/chat-panel.ts` + `apps/control-app/public/builder.html:74-181`

### Gaps confirmed against each of your points

| # | Issue | XGD does | first-contact does |
|---|---|---|---|
| G1 | Font size too big | `13px` on every chat element | inherits 16px page default; no `font-size` rules on `.fc-chat__editor-content` or `.fc-chat__message` |
| G2 | Input shape | `border-radius: 24px` pill, single border, accent on focus | `border-radius: 4px` rectangle |
| G3 | Send button | Round 36×36, **absolute-positioned inside** the input, `▶` play glyph, with sibling red `■` Stop button for in-flight | Rectangular button **outside** the input as a flex sibling, text "Send" + spinner overlay, no Stop |
| G4 | Input markdown rendering | Full CSS for h1/h2/h3, ul/ol, blockquote, pre/code, tables inside the TipTap editor | TipTap parses markdown on paste but **no CSS** styles any of it |
| G5 | Message markdown rendering | Both `user` and `assistant` get full markdown CSS | Assistant renders via `marked` (REQ-13 shipped this); **user messages still use `textContent`** — your bug |
| G6 | Tool-use pane | Collapsible pane at top with `▶/▼` chevron header, draggable resize divider, live tool-event entries | **Does not exist.** Tool calls render only as inline cards inside the assistant message via `chat-card.ts` |

### Related existing tickets

- **BUG-1** (closed) — fixed editor invisibility from TipTap migration; layout-only, didn't touch visual language
- **REQ-13** (ready_to_reconcile) — shipped *assistant* markdown + TipTap input + ChatCard primitive; **user-message markdown (G5) and input styling (G4) were not part of it**
- **REQ-32** — disables Send during in-flight; does NOT swap to Stop

### Three open questions before coding (in the ticket)

- **Q1**: Tool-use pane (G6) — replace inline cards, keep both, or skip the pane?
- **Q2**: Are XGD's tab bar / draft persistence / activity dots in scope here?
- **Q3**: Confirm 13px target

Could you weigh in on Q1–Q3? Once confirmed I can scope the implementation and start coding under REQ-36.

<!-- xgd-turn id="42e5b5af-c7a7-4f28-a77d-83dfb0981551-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T20:51:03.102Z" -->
#### You
Q1 keep both - they are not alternatives
Q2 no only one windo they are not needed
Q3 no try it

I have two other concerns I don't know whether you have captured:
1 - hitting enter should invoke "send" shift-enter aor alt-enter create a newline
2 - xgd chat appears as a stream - this new chat arrives as a block on completion

<!-- xgd-turn id="42e5b5af-c7a7-4f28-a77d-83dfb0981551-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T20:53:05.421Z" -->
#### Claude
Good additions. Let me verify both against the codebases before updating the ticket.

Both gaps confirmed. Let me also verify our chat endpoint shape.

Confirmed — our endpoint has no streaming at all. Let me append both concerns to REQ-36.

Now I'll update the ticket with operator's decisions on Q1-Q3 and add G8/G9 for the new concerns. I'll rewrite the body since `xgd ticket update --body-file` replaces wholesale.

Captured. Both confirmed against the codebases:

**G8 — Enter-to-send.** XGD `index.html:16439` uses bare Enter → send, modifier-Enter → newline. Ours (`chat-panel.ts:209-215`) is **inverted** — only `Cmd/Ctrl+Enter` sends; bare Enter falls through to TipTap as a newline. Easy fix: invert the modifier check and update the placeholder.

**G9 — Streaming.** XGD has `chat_api.py:generate_chat_sse()` streaming Claude tokens via SSE; client appends progressively. Ours (`apps/control-app/src/chat.ts` + `chat-driver.ts`) does a single `POST` → `await response.json()` → replace the assistant bubble in one shot. This is the largest change in the ticket — server switches to `messages.stream()`, client uses a `ReadableStream` reader, store needs an in-flight "streaming" message slot, and the Stop button (G3) finally has something to abort.

**Operator decisions captured:**
- Q1 → keep both tool-use pane (live "what the AI is doing") and inline ChatCard results (durable artefacts)
- Q2 → no tab bar, no empty state, no draft persistence, no activity dots — single window only
- Q3 → try 13px

**Recommendation flagged in the ticket**: G9 is large enough to consider splitting into REQ-37 so G1–G8 can ship as a fast visual/UX pass. Want me to:

1. Split G9 into a follow-up ticket and start free-coding G1–G8 now, or
2. Keep G9 in REQ-36 and tackle everything as one bundle?

<!-- xgd-turn id="d9a8a066-73c9-4883-91e2-86bce2e12f42-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:24:27.657Z" -->
#### You
Keep everything together - please can you free code this ticket now?

<!-- xgd-chat-end -->