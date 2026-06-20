---
uid: request-54b60186
id: REQ-36
type: request
title: 'Builder chat: audit and align with XGD chat capability (look, feel, markdown,
  tool pane)'
created_by: xgd
created_at: '2026-06-20T20:18:17.764253+00:00'
updated_at: '2026-06-20T20:52:54.096676+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: high
---

## Scope

Audit and rework the builder chat panel (`packages/builder-ui/src/components/chat-panel.ts` + CSS in `apps/control-app/public/builder.html`) so it matches the look, feel, and functional patterns of the XGD dashboard chat widget at `../xgendev-main/xgd_source/dashboard/static/index.html`. The current implementation was written from scratch and ignores design lessons already encoded in XGD.

Operator's framing: "we spent time honing a beautiful chat window with the right aesthetics and functionality and instead I have an ugly window … please review the xgendev chat capability and audit the look and feel and functionality."

## Reference implementations (read these in order)

- **XGD (the target)** — `../xgendev-main/xgd_source/dashboard/static/index.html`
  - CSS: lines 3902-4500 (`.chat-widget-*`, `.chat-input-wrapper`, `.chat-widget-send-btn`, `.chat-tool-header`, `.chat-tool-pane`, `.chat-message.*`)
  - HTML structure: lines 5197-5231 (floating chat window) and 5629-5635 (workspace chat)
  - Tool-pane toggle logic: lines 17840-17911 (`_toggleToolPane`, `_applyToolPaneState`, `_startDividerDrag`)
  - Enter-to-send: line 16439 (`handleKeyDown: if Enter && !shift && !alt && !meta && !ctrl → send`)
  - Streaming: `../xgendev-main/xgd_source/dashboard/chat_api.py` — `generate_chat_sse()` streams Claude tokens as Server-Sent Events; client consumes incrementally.

- **first-contact (the current implementation)**
  - `packages/builder-ui/src/components/chat-panel.ts` (DOM + TipTap setup + send handler)
  - `packages/builder-ui/src/components/chat-card.ts` (tool-result card primitive — separate from gap below)
  - `apps/control-app/public/builder.html` lines 74-181 (the CSS that the operator is reacting to)
  - `apps/control-app/src/chat.ts` (non-streaming POST handler returning `{ text, toolCalls }` as a single JSON body)
  - `packages/builder-ui/src/chat-driver.ts` (calls fetch then awaits full JSON; no SSE handling)

## Gap analysis — issues raised by operator + audit findings

### G1. Font size too big in chat
- **XGD**: 13px throughout (`.chat-widget-input`, `.chat-message.user`, `.chat-message.assistant` all `font-size: 13px`).
- **first-contact**: inherits the page default (`font-family: system-ui` at default 16px on body). `.fc-chat__editor-content` is `font: inherit` so it ends up at 16px. Messages have no font-size rule — also 16px.
- **Operator decision**: try 13px (XGD value) and tune from there.

### G2. Text-entry lacks the rounded-pill look
- **XGD**: `.chat-widget-input` is `border-radius: 24px`, `padding: 10px 62px 10px 10px` (right padding clears inline send button), `min-height: 64px`, `max-height: 232px`, single `1px solid` border that turns accent-coloured on focus. The whole input is one rounded capsule.
- **first-contact**: `.fc-chat__editor` is `border-radius: 4px` (sharp), with a separate-element Send button sitting outside. No pill shape.

### G3. Send button is wrong shape, wrong position, wrong glyph
- **XGD**: `.chat-widget-send-btn` is a 36×36 **round** button (`border-radius: 50%`), **absolute-positioned inside** the input wrapper (`right: 18px`, `top: 50%`, `transform: translateY(-50%)`), accent-coloured, glyph `▶` (`&#9654;`, a play triangle). A matching `.chat-widget-stop-btn` (red, glyph `■`) replaces it while a turn is in flight.
- **first-contact**: `.fc-chat__send` is a rectangular `border-radius: 4px` button sitting **outside** the input as a flex sibling, with text label "Send" + spinner. No play glyph, no round shape, no inside-the-input positioning, no stop-button affordance.

### G4. Chat input does not render rich markdown formatting visually
- **XGD**: `.chat-widget-input` is a TipTap (ProseMirror) editor with deep markdown styling — `h1/h2/h3`, `ul/ol`, `blockquote`, `pre`/`code`, tables. Pasted markdown renders as formatted content **inside the input** before send.
- **first-contact**: TipTap is mounted (`@tiptap/starter-kit` + `tiptap-markdown`), so input technically *parses* markdown on paste — but the **CSS doesn't style any of it**. `.fc-chat__editor-content p` is the only block rule. Headings, lists, code, blockquote, tables render as undecorated text.
- This overlaps [[REQ-13]] (which shipped basic input markdown handling); the gap is purely visual styling.

### G5. Chat content (assistant + user) markdown rendering
- **XGD**: both `.chat-message.user` and `.chat-message.assistant` get full markdown CSS — headings, paragraphs, lists, blockquote, pre/code, strong.
- **first-contact**: `chat-panel.ts:144-150` renders **assistant** messages through `marked` + DOMPurify (good — REQ-13 shipped this). But **user** messages use `textContent` (raw text). User-entered markdown does not render in the message list after send.
- Related ticket: [[REQ-13]] / [[BUG-1]] addressed assistant rendering and editor visibility. **User-message markdown rendering is the remaining gap** the operator is pointing at.

### G6. No tool-use pane (the collapsible chevron-headed pane at the top)
- **XGD**: a dedicated pane shows tool calls as they execute, with:
  - A clickable header row (`.chat-tool-header`) showing `▶ TOOL USE` (chevron + uppercase label).
  - Clicking the header toggles a `.chat-tool-pane` (hidden by default; chevron flips `▶` ↔ `▼`).
  - A draggable divider (`.chat-tool-divider`) below the pane lets the operator resize it as a percentage of the chat widget height; dragging to ≤5% closes it.
  - Live event entries (`.chat-tool-event`) appear as monospace lines showing tool name + first argument, expandable for full input/output.
- **first-contact**: no tool-use pane exists. Tool calls are surfaced *inside* the assistant message as inline rows (`.fc-chat__tool-call`) or full chat-cards (`createChatCard` from `chat-card.ts`). There is no collapsible pane separate from the message flow, no live "in-flight" view of what the AI is currently doing.
- **Operator decision**: keep **both**. The tool-use pane is a live "what is the AI doing right now" view; the inline chat-cards remain as the durable result artefacts. They are not alternatives.

### G7. Other XGD niceties (out of scope per operator)
- Empty-state hint, status indicator, draft persistence per tab, activity-dot indicators — **deferred**. Operator: "no, only one window, they are not needed."
- **Stop button replaces Send during in-flight turns** — **in scope** as part of G3 (the round red `■` Stop replaces the play `▶` Send in-flight; closer to XGD's behaviour than the current spinner-overlay).

### G8. Enter-to-send keyboard contract (operator-raised, 2nd round)
- **XGD**: `Enter` (no modifier) → send. `Shift+Enter` (or any modifier) → newline. See line 16439:
  `if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) { event.preventDefault(); _sendChatMessage() }`
  The data-placeholder string itself advertises this: `"Type a message... (Enter to send, Shift+Enter for newline)"`.
- **first-contact**: `chat-panel.ts:209-215` — **inverted**: `Enter` alone is treated as newline (TipTap default); only `Cmd/Ctrl+Enter` sends. There is no Shift+Enter or Alt+Enter handling because there's no special send key to override.
- **Required**: swap behaviour. Bare Enter sends; `Shift+Enter` and `Alt+Enter` insert a newline (handled by TipTap's defaults once we `preventDefault` only the bare-Enter case). Update placeholder text to advertise the new contract.

### G9. Streaming vs single-block response (operator-raised, 2nd round)
- **XGD**: `chat_api.py:generate_chat_sse()` streams Claude's response as SSE; client appends tokens to the active assistant bubble as they arrive. Visible as text "typing in" plus a live tool-pane stream.
- **first-contact**: `apps/control-app/src/chat.ts` is a single `POST /api/chat` that awaits the full Anthropic response, then `chat-driver.ts` (`runChatTurn`) replaces the assistant bubble in one shot when the JSON arrives. Visible delay → block arrival → no progressive rendering.
- **Required**: stream the assistant turn end-to-end:
  1. **Server (`apps/control-app/src/chat.ts`)**: switch from `messages.create()` to `messages.stream()` (Anthropic SDK supports SSE natively in workerd). Stream `text` deltas + tool-use blocks as SSE events. Schema: `event: token / tool_call / tool_result / done / error` with JSON `data:` payloads.
  2. **Client (`chat-driver.ts` + `chat-panel.ts`)**: replace the single-fetch `await response.json()` with a streaming reader (`response.body.getReader()` + `TextDecoder`). On each `token` event, append text to the in-flight assistant bubble (idempotent re-render). On each `tool_call`, push a row into the tool-use pane (G6). On `done`, finalise; on `error`, surface error banner.
  3. **State management**: the store needs an in-flight assistant message slot — currently it commits only after the full turn. Add a "streaming" message kind that the renderer treats specially (append-only, possibly with a caret indicator).
  4. **Stop button (G3 / G7) becomes meaningful**: aborting the SSE reader's `AbortController` halts the turn server-side too (workers pass abort through to the upstream).

This is the largest single change in the ticket — it touches client, server, and store. Splitting into a follow-up REQ is on the table if scope feels too wide here; flagging for operator decision.

## Existing related tickets

- [[BUG-1]] — closed (`free_coded`). Fixed editor invisibility / send-button positioning. Touched the *layout* not the *visual language*; G1-G5 are all still open.
- [[REQ-13]] — `ready_to_reconcile`. Shipped assistant markdown via `marked`, TipTap input, ChatCard primitive. **Does not** touch input-content markdown styling (G4), user-message markdown rendering (G5), the tool-use pane (G6), keyboard contract (G8), or streaming (G9).
- [[REQ-32]] — `Chat panel: block send while turn in flight (spinner + disabled button)`. Touches send-button state but does NOT replace Send with a Stop button (XGD pattern). Will need to coexist or be subsumed by G3 + G9.

## Proposed deliverables

1. **G1 + G2 + G4: Input restyle.** `.fc-chat__editor` becomes a single rounded-pill capsule (radius 24px, right padding for inline button, font-size 13px, accent border on focus, min-height ~64px, max-height ~232px). Port XGD's typography rules for headings/lists/code/blockquote/tables inside `.fc-chat__editor-content`.
2. **G3 + G7 (partial): Send & Stop buttons.** Round 36×36, absolute-positioned inside the input wrapper. Play glyph `▶` for Send (accent bg), square glyph `■` for Stop (red bg). Stop is hidden by default; shown via `[data-fc-chat-send-busy]`. Remove the spinner overlay (Stop replaces the spinner's role).
3. **G5: User-message markdown.** Render user messages through `renderMarkdownToDom` in `chat-panel.ts`. Add user-bubble markdown CSS (p, h1-h3, ul/ol, blockquote, pre, code, strong) per XGD lines 4285-4377.
4. **G6: Tool-use pane.** New DOM nodes between message list and input bar: `.fc-chat__tool-header` (clickable, chevron + label), `.fc-chat__tool-pane` (collapsed by default), `.fc-chat__tool-divider` (drag-resize). Chat-driver fires tool-event callbacks that append `.fc-chat__tool-event` entries. Inline `ChatCard` tool-result cards in the message list are **kept** (operator confirmed: both, not alternatives).
5. **G8: Enter-to-send.** Replace `chat-panel.ts:209-215` modifier check. Bare Enter → `submit()`; any modifier → fall through to TipTap default (newline). Update placeholder.
6. **G9: Streaming.** Server: switch to `messages.stream()` and emit SSE. Client: replace one-shot fetch with a streaming reader; the active assistant bubble updates progressively. Tool-pane (G6) fed by the same stream. Stop button (G3) wires its abort to the stream's `AbortController`. Recommend splitting into a follow-up REQ-37 if operator wants G1-G8 to ship first.

## Test plan (after design confirmed)

Free-coded UAT tests, `test_UAT_FC_REQ-36_*`:
- Send button is round (computed `border-radius: 50%`), accent-coloured, contains `▶`, positioned inside the input wrapper.
- During in-flight turn, Stop button is visible (red, `■`); clicking it aborts the stream.
- Input has `border-radius` ≥ 20px, single border that turns accent on focus, computed `font-size` ≤ 14px.
- Chat content `font-size` resolves to ~13px.
- User message containing markdown (`**bold**`, `# heading`, `- list`) renders as rendered HTML, not raw text.
- Editor content with pasted markdown renders headings/lists/code with expected typography (computed-style assertion on header weight, list padding, code background).
- Tool-use header click toggles the pane visible/hidden; chevron flips `▶` ↔ `▼`. Tool calls fired during a turn appear as `.fc-chat__tool-event` rows.
- Bare Enter in the editor triggers `onSend`; Shift+Enter inserts a newline (no send).
- Streaming: server SSE emits `token` events; client appends to assistant bubble incrementally (asserted by observing message text growing across two reads).

Regression scope: existing `tests/test_UAT_FC_REQ-13_*` and `tests/test_UAT_FC_BUG-1_*` to confirm no regression on assistant markdown / editor visibility / send positioning. `tests/test_UAT_FC_REQ-32_*` to reconcile with the new Stop-button affordance.
