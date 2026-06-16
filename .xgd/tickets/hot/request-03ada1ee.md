---
uid: request-03ada1ee
id: REQ-13
type: request
title: 'AI state visibility + chat markdown rendering: structured tool_results, get_site_definition
  read tool, marked output, TipTap input'
created_by: xgd
created_at: '2026-06-16T22:12:02.773721+00:00'
updated_at: '2026-06-16T22:12:02.773721+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 4
  auto_merge_back: true
  needs_review: false
---

## Scope

Two coupled improvements to the chat-driven builder experience:

1. **AI state visibility** — give the AI a reliable view of the post-edit site state. Today the AI sees only the original site definition and infers downstream state from its own emitted tool calls, leading to drift when calls partially fail or behave unexpectedly.
2. **Chat markdown rendering** — assistant messages currently render as raw markdown text; user paste into the chat input does not render markdown formatting. Both surfaces should render markdown (per XGD's pattern using `marked` for output and TipTap for input).

After this REQ: the AI receives structured tool results after each tool call AND can call a read tool to refresh its view of the canonical state. Assistant messages display as rendered markdown in the chat. The chat input editor accepts pasted markdown and renders it as formatted text; submission serializes back to markdown for the API.

Design discussion: in-app feedback from Claude running in the builder identified state visibility as the top friction ("I'm working from memory/inference rather than a confirmed updated state"). Operator separately flagged that assistant messages render as raw markdown. XGD's chat panel pattern (`marked@9` from esm.sh + TipTap editor) is the reference implementation.

## Why free-coded

Bugs / gaps on top of an already-shipped feature ([[REQ-8]] builder). Narrow scope, settled design (mirror XGD's approach), no architectural change. Cohesive intent: make the AI's view of state coherent and the operator's view of chat content legible.

## Dependencies

- [[REQ-8]] — builder UI shell, chat panel, /api/chat endpoint.
- [[REQ-9]] — Operator API registry (for the new read tool).

## Deliverables

### Part 1: AI state visibility

**Structured tool results in chat dispatch (`apps/control-app/src/api/chat`)**

Every tool call returned by Anthropic gets a structured `tool_result` content block in the AI's next turn input:

```typescript
type ToolResult =
  | { ok: true,  applied: { tool: string, args: object, summary: string } }
  | { ok: false, error: { tool: string, validation: ValidationError } }
```

`summary` is a short human-readable description of what landed (e.g. `"hero.dials.spacingTop set to 'lg'"`). Lets the AI confirm its action without having to receive the full updated state every turn.

**`get_site_definition` read tool**

Add to `OPERATOR_ACTIONS` (from REQ-9):

```
name:          'get_site_definition'
plan_tier:     'trial'  (available to all; read-only)
tool_spec:     { description: "Read the current site definition (draft state).",
                 input: {} }
ui_route:      null      (chat-only; no UI affordance)
```

Handler returns the current `draft_definition` for the active site. The AI calls this when it needs to verify state — e.g., after a sequence of edits, or when continuing a complex multi-step change.

Cost note: site definitions are typically <100KB. Sending one per AI request is acceptable; if it becomes painful at scale, paginate by page or by module. v1 returns the whole thing.

**Per-turn state summary in system prompt**

When the AI is invoked for a new turn, the system prompt section that describes "current site state" is computed fresh from the canonical state (not from the previous turn's snapshot). Ensures continuation accuracy across long sessions.

### Part 2: Chat markdown rendering

**Assistant message rendering (`packages/builder-ui/src/ChatPanel`)**

Replace the existing plaintext renderer for assistant turns with a markdown renderer. Library: `react-markdown` (the React-idiomatic equivalent of XGD's `marked`). Options:

- GFM extensions enabled (tables, task lists, strikethrough)
- Code blocks rendered with syntax highlighting (any reasonable choice — `react-syntax-highlighter` is the standard pairing)
- Links open in new tab with `rel="noopener noreferrer"`
- Sanitization: react-markdown is XSS-safe by default; do not bypass

User-turn rendering stays plaintext (operator's typed input is shown as-is) — see Part 2b for input handling.

**Chat input editor (`packages/builder-ui/src/ChatPanel`)**

Replace the plain `<textarea>` with a TipTap editor:

- Extensions: StarterKit, Markdown (via `tiptap-markdown` or equivalent)
- Behavior: pasted markdown is parsed and rendered as formatted text in the editor; typing markdown shortcuts (e.g. `**bold**`) renders as bold; submission serializes editor state back to markdown for the API
- Same key bindings as the previous textarea: Cmd/Ctrl+Enter to send, Shift+Enter for newline
- Placeholder text remains

The editor's serialized markdown is what gets sent to `/api/chat`. Backend doesn't care which editor produced it.

### Sanitization + safety

- Assistant message HTML output goes through react-markdown's default sanitization. Raw HTML blocks in AI output are stripped (default react-markdown behaviour).
- Code blocks display verbatim — important for AI tool-result summaries that may include JSON.
- Links in assistant messages are clickable but open in new tabs.

### Tests (`test_UAT_FC_<REQ-ID>_*`)

- `tool_call_returns_structured_ok_result` — successful tool call produces a `tool_result` with `ok: true` and a non-empty summary string visible in the AI's next prompt.
- `tool_call_returns_structured_error_result` — invalid dial value produces `tool_result` with `ok: false` and a validation error matching the validator's structured output.
- `get_site_definition_returns_current_draft` — calling the read tool returns the current `draft_definition` matching what the builder's store holds.
- `get_site_definition_available_on_trial` — trial plan can call the read tool (no plan-tier rejection).
- `assistant_markdown_renders_headers_lists_code` — a stubbed assistant message containing `## Heading`, `- list item`, and a fenced code block renders as `<h2>`, `<ul><li>`, and `<pre><code>` in the DOM.
- `assistant_markdown_strips_inline_html` — assistant message `<script>alert(1)</script>` does not produce a script tag in the DOM.
- `chat_input_paste_markdown_renders_formatted` — pasting `# Title\n\n**bold**` into the input editor renders heading and bold styling in the editor.
- `chat_input_submission_serializes_back_to_markdown` — submitting an edited message sends markdown (not HTML) to `/api/chat`.

## Out of scope

- Markdown rendering in module content fields (already framework-side; covered by future "framework markdown rendering" REQ if needed).
- Streaming token-by-token rendering of assistant messages — current behaviour renders on turn-complete; streaming UX is a later polish REQ.
- AI-generated rich content (images, embeds) — text-only assistant rendering for v1.
- Diff-style visualization of what changed per tool call.

## Risks / open items

- **TipTap bundle size** — TipTap + extensions add ~30–60KB gzipped to the builder. Acceptable for the desktop-first builder app per DOC-8 §8.1 mobile-budget rules (which apply to customer sites, not the builder).
- **Markdown round-trip fidelity** — TipTap's markdown serialization may not preserve every edge case the user typed (e.g. exotic table syntax). For v1, lossy round-trip is acceptable — chat is for conversation, not document authoring.
- **Tool-result token cost** — adding structured tool_result blocks adds tokens per turn. Negligible for v1 (single-digit tool calls per turn); monitor if turns get chatty.
