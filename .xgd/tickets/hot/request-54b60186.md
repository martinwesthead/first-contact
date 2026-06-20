---
uid: request-54b60186
id: REQ-36
type: request
title: 'Builder chat: audit and align with XGD chat capability (look, feel, markdown,
  tool pane)'
created_by: xgd
created_at: '2026-06-20T20:18:17.764253+00:00'
updated_at: '2026-06-20T21:52:32.374870+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: high
  commits:
  - be19e5f1408165a2323bc3d8e63b2b9d4077b2a6
  - 9121fdddf9307de1f08a6a48d469a063206f788d
  version: 0.0.17
---

## Status

**FREE-CODED 2026-06-20.** All G1-G9 gaps closed in one bundle (operator: keep together). 17 UAT tests in `tests/test_UAT_FC_REQ-36_*.test.ts`.

## Scope

Audit and rework the builder chat panel (`packages/builder-ui/src/components/chat-panel.ts` + CSS in `apps/control-app/public/builder.html`) so it matches the look, feel, and functional patterns of the XGD dashboard chat widget at `../xgendev-main/xgd_source/dashboard/static/index.html`. The current implementation was written from scratch and ignored design lessons already encoded in XGD.

Operator's framing: "we spent time honing a beautiful chat window with the right aesthetics and functionality and instead I have an ugly window … please review the xgendev chat capability and audit the look and feel and functionality."

## Reference implementations

- **XGD (the target)** — `../xgendev-main/xgd_source/dashboard/static/index.html`
  - CSS: lines 3902-4500 (`.chat-widget-*`, `.chat-input-wrapper`, `.chat-widget-send-btn`, `.chat-tool-header`, `.chat-tool-pane`, `.chat-message.*`)
  - HTML: lines 5197-5231, 5629-5635
  - Tool-pane toggle logic: lines 17840-17911
  - Enter-to-send: line 16439 — `if Enter && !shift && !alt && !meta && !ctrl → send`
  - Streaming: `../xgendev-main/xgd_source/dashboard/chat_api.py` — `generate_chat_sse()` streams Claude tokens via SSE; client appends incrementally.

- **first-contact (now reworked)**
  - `packages/builder-ui/src/components/chat-panel.ts` — DOM + TipTap + Send/Stop buttons + tool-pane + Enter handler
  - `packages/builder-ui/src/components/chat-card.ts` — inline tool-result card primitive (retained alongside the new tool-pane per operator decision)
  - `apps/control-app/public/builder.html` — CSS overhaul lines 74-407
  - `apps/control-app/src/chat.ts` — streaming SSE handler (was non-streaming JSON)
  - `packages/builder-ui/src/chat-driver.ts` — streaming SSE reader (was single-fetch JSON)

## Gap closures

### G1. Font size too big — CLOSED
`.fc-chat` now declares `font-size: 13px; line-height: 1.6;` (XGD parity). Messages and editor content inherit.

### G2. Text-entry now a rounded pill — CLOSED
`.fc-chat__editor` is `border-radius: 24px`, single `1px` border, accent `#2563eb` on focus, `min-height: 44px`, `max-height: 232px`. `.fc-chat__editor-content` uses `padding: 10px 62px 10px 14px` to clear the inline button (XGD's 62px right-pad).

### G3 + G7. Round Send/Stop inside the input — CLOSED
- `.fc-chat__send` — 36×36 `border-radius: 50%`, absolute-positioned `right: 8px; bottom: 8px`, accent background, glyph `▶`.
- `.fc-chat__stop` — same shape, red `#dc2626`, glyph `■`, hidden by default.
- Busy state: `data-fc-chat-send-busy` hides Send, `data-fc-chat-stop-visible` shows Stop. The spinner overlay was removed entirely.
- The `ChatPanelHandle` now exposes `stopButton`; the chat-driver wires its abort to a per-turn `AbortController`.

### G4. Input markdown typography — CLOSED
`.fc-chat__editor-content` now styles `h1/h2/h3`, `ul/ol`, `blockquote`, `pre`, `code`, `table`, `th/td`. Pasted markdown renders formatted in the input. Placeholder text "Type a message... (Enter to send, Shift+Enter for newline)" added via `@tiptap/extension-placeholder` (new dep on `@tiptap/extension-placeholder@^2.6.0`).

### G5. User-message markdown rendering — CLOSED
`chat-panel.ts` `renderMessage` now calls `renderMarkdownToDom` for both `user` and `assistant` roles (system stays plaintext). User-bubble CSS adds h1-h3, p, ul/ol, blockquote, pre, code, strong rules with bubble-appropriate colours. Test: `test_UAT_FC_REQ-36_user_message_markdown_renders.test.ts`.

### G6. Tool-use pane (collapsible) — CLOSED
- New DOM: `.fc-chat__tool-header` (chevron + label), `.fc-chat__tool-pane` (collapsed by default), `.fc-chat__tool-pane-body` (event rows).
- Header click toggles pane; chevron flips `▶` ↔ `▼`.
- ChatPanel exposes `appendToolEvent(detail)`, `clearToolEvents()`, `expandToolPane()`.
- Chat-driver fires `onToolCallStart` (tool_use block completed) and `onToolCallResolved` (server-side result) callbacks. `main.ts` wires them to `appendToolEvent` and `expandToolPane`.
- Inline `ChatCard` tool-result renderers in the message list are **kept** (operator decision: both, not alternatives). Tool-pane is the live "what is the AI doing right now" view; inline cards are durable result artefacts.
- Test: `test_UAT_FC_REQ-36_tool_pane_collapsible.test.ts`.

### G8. Enter-to-send keyboard contract — CLOSED
`chat-panel.ts` TipTap mount uses `editorProps.handleKeyDown`: bare Enter → submit; any modifier (Shift/Alt/Meta/Ctrl) → fall through to TipTap's default newline behaviour. Placeholder advertises the contract. Tests: `test_UAT_FC_REQ-36_enter_sends_modifier_inserts_newline.test.ts` (4 tests covering bare/shift/meta/alt).
**Legacy REQ-32 Cmd+Enter test updated** to drive submission via the Send button click (modality-agnostic) so the existing "no double-submit while busy" invariant is preserved.

### G9. End-to-end streaming — CLOSED
- **Server** (`apps/control-app/src/chat.ts`): now returns `Response(stream, content-type: text/event-stream)`. The multi-turn loop emits these SSE events:
  - `token { delta }` — text delta from Anthropic forwarded as it arrives
  - `tool_call { name, input, toolUseId }` — fired the moment a `tool_use` block's input JSON has been reassembled from `input_json_delta` chunks
  - `tool_result { name, input, result, toolUseId }` — server-side execution result
  - `done { text, toolCalls, systemActions, intentToken }` — final aggregate for the FE to commit
  - `error { error }` — fatal error before/during stream
- The server consumes Anthropic's native streaming SSE (`stream: true` upstream) — see `consumeAnthropicStream()` in `chat.ts` which parses `content_block_start/delta/stop` and accumulates `partial_json` per tool_use.
- **Client** (`chat-driver.ts`): replaces single-fetch JSON with `response.body.getReader()` + SSE frame parser. Appends an empty in-flight assistant bubble at turn start; grows it on each `token`; fires `onToolCallStart`/`onToolCallResolved` callbacks for the panel's tool-pane; commits final text + structured `toolCalls` on `done`. New `store.updateLastChatMessage()` lets the driver mutate the in-flight bubble in place without rebuilding history each token.
- **Stop button** (G3/G7) ties to the streaming `AbortController` so clicking Stop aborts the SSE reader and the upstream Anthropic request.
- **Legacy REQ-32 spinner CSS test** updated to assert the new Send/Stop swap pattern instead.
- Test: `test_UAT_FC_REQ-36_streaming_assistant_bubble.test.ts` proves the bubble grows progressively across `token` events (not a single block on completion) and that `error` events surface a sorry-message bubble.

## Files touched

- `apps/control-app/public/builder.html` — CSS overhaul (G1-G7)
- `apps/control-app/src/chat.ts` — streaming SSE handler (G9 server)
- `packages/builder-ui/package.json` — add `@tiptap/extension-placeholder`
- `packages/builder-ui/src/components/chat-panel.ts` — DOM + buttons + tool-pane + Enter handler + markdown (G3, G5, G6, G8)
- `packages/builder-ui/src/chat-driver.ts` — streaming SSE reader + tool-event callbacks (G9 client)
- `packages/builder-ui/src/store.ts` — `updateLastChatMessage` for in-flight bubble (G9)
- `packages/builder-ui/src/main.ts` — wire chat-panel tool callbacks + abort signal
- `packages/builder-ui/src/index.ts` — re-export `ChatToolEvent`; remove obsolete `ChatApiResponse`
- `tests/_helpers_REQ-36_chat_sse.ts` — new: `consumeChatSSE`, `makeChatSSEResponse`, `encodeAnthropicSSE`, `makeAnthropicStreamingFetch`
- `tests/_helpers_REQ-13_anthropic.ts` — emit SSE (transparent for callers)

## Tests

- `test_UAT_FC_REQ-36_chat_ui_xgd_parity.test.ts` — G1-G4 + G3/G7 CSS contract (6 tests)
- `test_UAT_FC_REQ-36_user_message_markdown_renders.test.ts` — G5 (2 tests)
- `test_UAT_FC_REQ-36_tool_pane_collapsible.test.ts` — G6 toggle + appendToolEvent + DOM order (3 tests)
- `test_UAT_FC_REQ-36_enter_sends_modifier_inserts_newline.test.ts` — G8 keyboard contract (4 tests)
- `test_UAT_FC_REQ-36_streaming_assistant_bubble.test.ts` — G9 progressive bubble + error handling (2 tests)

Existing tests updated to consume the new SSE shape: REQ-8 (×3), REQ-9, REQ-13 (×3), REQ-21, REQ-30 (×2), REQ-32 (×2 — spinner→Send/Stop, Cmd+Enter→Send click), REQ-34, REQ-9. Pre-existing failures (BUG-5 / REQ-30 doc drift) are unrelated to this REQ.

Total UAT suite: 475/477 passing; the 2 failures are pre-existing doc-drift in `REPRODUCING_A_WEBSITE_DOC` from concurrent REQ-37 work.