---
uid: request-03ada1ee
id: REQ-13
type: request
title: 'AI state visibility + chat markdown rendering: structured tool_results, get_site_definition
  read tool, marked output, TipTap input'
created_by: xgd
created_at: '2026-06-16T22:12:02.773721+00:00'
updated_at: '2026-06-25T02:41:17.395483+00:00'
completed_at: null
last_field_updated: status
status: bundled
fields:
  priority: high
  story_points: 5
  auto_merge_back: true
  needs_review: false
  commits:
  - 8628a0a8ea863795e3c285088b03eac5fc5912b6
  bundled_in: bundle-bbb1bd9c
---

## Scope

Three coupled improvements to the chat-driven builder experience:

1. **AI state visibility** — give the AI a reliable view of the post-edit site state. Today the AI sees only the original site definition and infers downstream state from its own emitted tool calls, leading to drift when calls partially fail or behave unexpectedly.
2. **Chat markdown rendering** — assistant messages currently render as raw markdown text; user paste into the chat input does not render markdown formatting. Both surfaces should render markdown (per XGD's pattern using `marked` for output and TipTap for input).
3. **Reusable chat-card pattern** — a `<ChatCard>` UI primitive that every structured `tool_result` renderer consumes. Defined here so [[REQ-21]]'s `<DigestReport>`, [[REQ-28]]'s `<ConvertConfirmation>`, and every future structured tool_result inherit a consistent shell (header / body / optional actions row) rather than each one styling itself.

After this REQ: the AI receives structured tool results after each tool call AND can call a read tool to refresh its view of the canonical state. Assistant messages display as rendered markdown in the chat. The chat input editor accepts pasted markdown and renders it as formatted text; submission serializes back to markdown for the API. Structured `tool_result` blocks render as consistent chat cards.

Design discussion: in-app feedback from Claude running in the builder identified state visibility as the top friction ("I'm working from memory/inference rather than a confirmed updated state"). Operator separately flagged that assistant messages render as raw markdown. XGD's chat panel pattern (`marked@9` from esm.sh + TipTap editor) is the reference implementation. The chat-card pattern was added in the 2026-06-18 planning chat once we realised that [[REQ-21]] and [[REQ-28]] each ship card-style chat affordances and would otherwise diverge.

## Why free-coded

Bugs / gaps on top of an already-shipped feature ([[REQ-8]] builder). Narrow scope, settled design (mirror XGD's approach), no architectural change. Cohesive intent: make the AI's view of state coherent and the operator's view of chat content legible — including the new card pattern downstream renderers will reuse.

## Dependencies

- [[REQ-8]] — builder UI shell, chat panel, /api/chat endpoint.
- [[REQ-9]] — Operator API registry (for the new read tool).

## Demo critical-path alignment

This REQ is on the convert-flow demo critical path (paste URL → reproduce site). Per the 2026-06-18 planning chat, [[REQ-23]] / [[REQ-24]] (chat persistence) and [[REQ-27]] (Brief) are deferred — the demo runs against [[REQ-8]]'s in-memory chat handler. Nothing in this REQ depends on persistence; the structured tool_results, state-visibility read tool, markdown rendering, and `<ChatCard>` primitive all work against the existing handler.

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

### Part 3: Reusable `<ChatCard>` pattern

**Component (`packages/builder-ui/src/components/ChatCard.tsx`)**

A small composable primitive used by every structured-`tool_result` renderer. Props:

```typescript
type ChatCardProps = {
  title: string,
  icon?: ReactNode,             // small leading glyph (e.g. screenshot / convert / warning)
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger',
  children: ReactNode,           // body slot
  actions?: ReactNode,           // optional actions row (buttons, checkboxes)
  collapsed?: boolean,           // optional: card body can collapse to header-only
  onToggleCollapse?: () => void,
}
```

- Shell: bordered card with rounded corners; padding consistent with the chat bubble grid; tone applies a left-edge accent.
- Header row: icon + title, plus the collapse caret when `onToggleCollapse` is provided.
- Body slot is rendered as a vertical flow; long content scrolls within a max-height.
- Actions row sits at the bottom with a subtle divider; horizontal flex with consistent button styling.
- Cards live **inside the chat panel's message flow** — they are themselves rendered as an assistant-side message variant. The dispatcher decides whether a tool_result becomes a plain markdown message or a `<ChatCard>` based on the result's `kind` discriminator.

**`tool_result` → card dispatcher**

When the assistant turn includes a `tool_result` with a known `kind` (e.g. `reference_digest`, `convert_confirmation`, future `transcribe_progress`), the chat panel renders the dedicated component (which itself uses `<ChatCard>`). Unknown kinds fall back to the markdown renderer.

```typescript
const TOOL_RESULT_RENDERERS: Record<string, ComponentType<{result: ToolResult}>> = {
  reference_digest: DigestReport,        // shipped by REQ-21
  convert_confirmation: ConvertConfirmation,  // shipped by REQ-28
  transcribe_progress: TranscribeProgress,    // shipped by REQ-28
};
```

This REQ delivers the dispatcher + the `<ChatCard>` primitive. Downstream REQs supply the per-kind components.

### Sanitization + safety

- Assistant message HTML output goes through react-markdown's default sanitization. Raw HTML blocks in AI output are stripped (default react-markdown behaviour).
- Code blocks display verbatim — important for AI tool-result summaries that may include JSON.
- Links in assistant messages are clickable but open in new tabs.
- `<ChatCard>` does not bypass sanitization for its `children` — downstream renderers are responsible for their own content safety (they typically render structured data, not free HTML).

### Tests (`test_UAT_FC_<REQ-ID>_*`)

- `tool_call_returns_structured_ok_result` — successful tool call produces a `tool_result` with `ok: true` and a non-empty summary string visible in the AI's next prompt.
- `tool_call_returns_structured_error_result` — invalid dial value produces `tool_result` with `ok: false` and a validation error matching the validator's structured output.
- `get_site_definition_returns_current_draft` — calling the read tool returns the current `draft_definition` matching what the builder's store holds.
- `get_site_definition_available_on_trial` — trial plan can call the read tool (no plan-tier rejection).
- `assistant_markdown_renders_headers_lists_code` — a stubbed assistant message containing `## Heading`, `- list item`, and a fenced code block renders as `<h2>`, `<ul><li>`, and `<pre><code>` in the DOM.
- `assistant_markdown_strips_inline_html` — assistant message `<script>alert(1)</script>` does not produce a script tag in the DOM.
- `chat_input_paste_markdown_renders_formatted` — pasting `# Title\n\n**bold**` into the input editor renders heading and bold styling in the editor.
- `chat_input_submission_serializes_back_to_markdown` — submitting an edited message sends markdown (not HTML) to `/api/chat`.
- `chatcard_renders_with_title_body_actions` — a `<ChatCard>` instance renders the title in the header, the children in the body, and the action buttons in the actions row; an action click dispatches its callback.
- `chatcard_tone_applies_accent` — passing `tone="warning"` applies the warning accent class.
- `chatcard_collapse_toggles_body` — when `onToggleCollapse` is wired, clicking the caret hides the body and re-renders header-only.
- `tool_result_dispatcher_uses_kind` — a `tool_result` with `kind: "reference_digest"` is routed to `<DigestReport>` (stubbed in this REQ's tests); an unknown kind falls back to the markdown renderer.

## Out of scope

- Markdown rendering in module content fields (already framework-side; covered by future "framework markdown rendering" REQ if needed).
- Streaming token-by-token rendering of assistant messages — current behaviour renders on turn-complete; streaming UX is a later polish REQ.
- AI-generated rich content (images, embeds) — text-only assistant rendering for v1.
- Diff-style visualization of what changed per tool call.
- The per-kind components (`<DigestReport>`, `<ConvertConfirmation>`, `<TranscribeProgress>`) themselves — shipped by [[REQ-21]] and [[REQ-28]]. This REQ ships only the primitive, the dispatcher, and a stub component for the dispatcher unit test.

## Risks / open items

- **TipTap bundle size** — TipTap + extensions add ~30–60KB gzipped to the builder. Acceptable for the desktop-first builder app per DOC-8 §8.1 mobile-budget rules (which apply to customer sites, not the builder).
- **Markdown round-trip fidelity** — TipTap's markdown serialization may not preserve every edge case the user typed (e.g. exotic table syntax). For v1, lossy round-trip is acceptable — chat is for conversation, not document authoring.
- **Tool-result token cost** — adding structured tool_result blocks adds tokens per turn. Negligible for v1 (single-digit tool calls per turn); monitor if turns get chatty.

## Story points

5. State-visibility plumbing + read tool + react-markdown wiring + TipTap chat input + `<ChatCard>` primitive + dispatcher. (Was 4 before the chat-card pattern was added.)



## Free-coded delivery (2026-06-18)

**Status**: implemented, all tests pass (187/187), `xgd quality run --all-tests` clean, bundle built.

### Commit
- `8628a0a` — feat(chat): AI state visibility + chat markdown + ChatCard primitive (REQ-13) [FREE-CODED]

### Implementation notes (deviations from the original spec)

- **React → vanilla**: The original deliverables called for `react-markdown` + a `<ChatCard>` React component, but `packages/builder-ui` is vanilla TypeScript / DOM end-to-end. Translated to:
  - `marked@14` + `DOMPurify@3` for assistant message rendering (closer to XGD's reference `marked@9` pattern).
  - `createChatCard(parent, options)` vanilla factory matching the existing `createChatPanel` / `createPreviewPanel` style. Same props (title, icon, tone, body, actions, collapsed, onToggleCollapse), same UX.
- **TipTap stays as specified** (`@tiptap/core` + `@tiptap/starter-kit` + `tiptap-markdown`). Works in vanilla JS because it's built on ProseMirror, not React.
- **State-edit validator stays on the client** (REQ-8 §5.3 validator-of-record contract preserved). Server runs `applyToolCall` against a working copy *for the tool_result summary only*; the FE re-runs it to authoritatively apply.

### Files

- `apps/control-app/src/chat.ts` — multi-turn Anthropic loop (max 8 iterations) with structured `tool_result` blocks.
- `apps/control-app/src/operator/registry.ts` — `get_site_definition` system action; `ActionContext.siteDefinition` threading.
- `apps/control-app/src/operator/router.ts` — passes `siteDefinition: null` to handlers invoked via direct `/api/operator/*` route.
- `packages/builder-ui/src/components/chat-card.ts` — `<ChatCard>` primitive.
- `packages/builder-ui/src/components/tool-result-renderers.ts` — kind→renderer registry + fallback dispatcher.
- `packages/builder-ui/src/components/chat-panel.ts` — marked+DOMPurify assistant rendering, TipTap input, tool_result dispatcher wired into the message renderer.
- `packages/builder-ui/src/store.ts` — widened `ChatMessage.toolCalls` to include optional `result: ChatToolResultRecord`.
- `packages/builder-ui/src/chat-driver.ts` — consumes the new server `result` field, still re-applies via `applyToolCall` client-side.

### Tests (12 files, 22 cases, all passing)

UATs match every test listed in the REQ deliverables section:
- `tool_call_returns_structured_ok_result` — `tool_result` content block reaches the next Anthropic prompt with `ok:true` + summary.
- `tool_call_returns_structured_error_result` — invalid dial value → `ok:false` with structured validator output, `is_error:true` on the block.
- `get_site_definition_returns_current_draft` — read tool returns the current draft via `applied.data.site_definition`.
- `get_site_definition_available_on_trial` — all tiers see the tool; registration sanity.
- `assistant_markdown_renders_headers_lists_code` — `<h2>`, `<ul><li>`, `<pre><code>` from markdown source.
- `assistant_markdown_strips_inline_html` — `<script>` and on-event handlers removed by DOMPurify.
- `chat_input_paste_markdown_renders_formatted` — `setInputMarkdown("# Title\n\n**bold**")` renders `<h1>` and `<strong>` in the TipTap surface.
- `chat_input_submission_serializes_back_to_markdown` — send delivers markdown to `onSend`, not HTML.
- `chatcard_renders_with_title_body_actions` — header / body / actions row; clicks dispatch callbacks.
- `chatcard_tone_applies_accent` — all 5 tones add the correct class + `data-fc-chat-card-tone`.
- `chatcard_collapse_toggles_body` — caret click toggles body visibility, fires `onToggleCollapse(next)`.
- `tool_result_dispatcher_uses_kind` — registered kind routes to its renderer; unknown kind falls back to markdown; failures render danger-toned card.

### Bundle impact

`apps/control-app/public/_assets/builder.js` is now 1.2 MB unminified (≈250–400 KB gzipped) — TipTap/ProseMirror dominate. Accepted per the REQ's own §Risks note (desktop-first builder, DOC-8 §8.1 mobile budget does not apply).

### Out-of-scope items deliberately not delivered (confirms with REQ)

- No streaming token-by-token rendering.
- No diff-style visualization.
- No per-kind components (`<DigestReport>`, `<ConvertConfirmation>`, `<TranscribeProgress>`) — registered through the dispatcher by their owning REQs (REQ-21, REQ-28).