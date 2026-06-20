---
uid: request-54b60186
id: REQ-36
type: request
title: 'Builder chat: audit and align with XGD chat capability (look, feel, markdown,
  tool pane)'
created_by: xgd
created_at: '2026-06-20T20:18:17.764253+00:00'
updated_at: '2026-06-20T20:26:06.125401+00:00'
completed_at: null
last_field_updated: priority
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

- **first-contact (the current implementation)**
  - `packages/builder-ui/src/components/chat-panel.ts` (DOM + TipTap setup + send handler)
  - `packages/builder-ui/src/components/chat-card.ts` (tool-result card primitive — separate from gap below)
  - `apps/control-app/public/builder.html` lines 74-181 (the CSS that the operator is reacting to)

## Gap analysis — issues raised by operator + audit findings

### G1. Font size too big in chat
- **XGD**: 13px throughout (`.chat-widget-input`, `.chat-message.user`, `.chat-message.assistant` all `font-size: 13px`).
- **first-contact**: inherits the page default (`font-family: system-ui` at default 16px on body). `.fc-chat__editor-content` is `font: inherit` so it ends up at 16px. Messages have no font-size rule — also 16px.

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

### G7. Other XGD niceties the audit surfaces (for context, not blocking)
- Empty-state hint when message list is empty.
- Status indicator (`Idle` / streaming) in a tab bar.
- Stop button replaces Send during in-flight turns.
- Persistent input draft per chat tab.
- Activity-dot indicators on background-streaming tabs.

These are likely out of scope for this REQ — flag them but do not implement now unless operator widens scope.

## Existing related tickets

- [[BUG-1]] — closed (`free_coded`). Fixed editor invisibility / send-button positioning. Touched the *layout* not the *visual language*; G1-G5 are all still open.
- [[REQ-13]] — `ready_to_reconcile`. Shipped assistant markdown via `marked`, TipTap input, ChatCard primitive. **Does not** touch input-content markdown styling (G4), user-message markdown rendering (G5), or the tool-use pane (G6).
- [[REQ-32]] — `Chat panel: block send while turn in flight (spinner + disabled button)`. Touches send-button state but does NOT replace Send with a Stop button (XGD pattern).

## Proposed deliverables (for operator confirmation before any code work)

1. **Restyle `.fc-chat__editor` + `.fc-chat__editor-content`** as a single rounded-pill input (border-radius 24px, padding-right for inline button, font-size 13px, accent border on focus, min/max height).
2. **Replace `.fc-chat__send`** with the XGD pattern: round 36×36, absolute-positioned inside the input wrapper, accent background, `▶` play glyph. Add a sibling `.fc-chat__stop` (red, `■` glyph, hidden by default) shown via `[data-fc-chat-send-busy]` instead of the spinner overlay.
3. **Markdown styling for `.fc-chat__editor-content`** — port XGD's typography rules for h1/h2/h3, p, ul/ol, blockquote, pre, code, table.
4. **Render user messages through `renderMarkdownToDom`** (G5) — mirror assistant handling; add user-bubble markdown CSS rules (headings, p, ul/ol, blockquote, pre, code, strong) per XGD lines 4285-4377.
5. **Tool-use pane** (G6) — add the collapsible header + pane between message list and input bar. Initial state collapsed. Header chevron `▶` ↔ `▼`. Wire chat-driver's tool-call events to render `.fc-chat__tool-event` entries. Decision needed: keep existing inline tool-result cards (`ChatCard`) AS WELL, or move them all into the pane?

## Open questions for operator

- **Q1 (G6 design choice)**: XGD shows tool calls in a separate top pane *only*. first-contact today renders structured tool_results as inline cards inside the assistant message. Do we (a) replace inline rendering with the top pane, (b) keep both — pane is a live "tool log" plus the inline card persists as the durable artifact, or (c) leave inline cards and skip the pane?
- **Q2 (scope)**: Are G7 items (empty state, tab bar, stop button, draft persistence, activity dots) in scope here or follow-ups? Operator listed Stop button implicitly via Send-as-play; the others were not raised.
- **Q3 (font scale)**: confirm 13px target for chat content — matches XGD; current default ~16px feels "too big" to operator.

## Test plan (after design confirmed)

Free-coded UAT tests, `test_UAT_FC_REQ-36_*`:
- Send button is round, accent-coloured, contains play glyph, positioned inside the input wrapper.
- Input has border-radius ≥20px, single border that turns accent on focus.
- Chat content `font-size` resolves to ~13px (not page default).
- User message containing markdown (`**bold**`, `# heading`, `- list`) renders as rendered HTML, not as raw text.
- Editor content with pasted markdown renders headings/lists/code with the expected typography (computed style assertion).
- Tool-use header click toggles the pane visible/hidden; chevron flips `▶` ↔ `▼`.
- Send-while-in-flight shows the Stop affordance (G3 corollary), assuming we adopt this from XGD.

Regression scope: existing `tests/test_UAT_FC_REQ-13_*` and `tests/test_UAT_FC_BUG-1_*` to confirm no regression on assistant markdown / editor visibility / send positioning.
