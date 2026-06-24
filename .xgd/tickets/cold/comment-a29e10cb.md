---
uid: comment-a29e10cb
id: COMMENT-15
type: comment
title: Comment on request REQ-13
created_by: xgd
created_at: '2026-06-16T22:13:18.202090+00:00'
updated_at: '2026-06-18T23:42:50.418541+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-03ada1ee
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-16T22:13:15Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-16T14:30:00.000Z" -->
#### You
[Operator pasted feedback from Claude running in the actual builder app:]

"**Things I feel I *should* be able to do but currently can't:**
- **Read back the result of my changes** — I only see the original site definition. After I make tool calls, I'm working from memory/inference rather than a confirmed updated state. If something goes wrong, I might not catch it.
[...other gaps...]
Overall the instructions are quite clear — the main friction is the lack of a **confirmed post-edit state**."

Another important gap in the current builder is markdown rendering - I am currently seeing the markdown, it is not being rendered. Can you help me organize the requirements into a set of REQs please?

<!-- xgd-chat role="assistant" ts="2026-06-16T14:30:00.000Z" -->
#### Claude
**State visibility issue** decomposes into:
- Tool execution may not be returning structured tool_result to AI (so AI guesses what happened)
- No explicit read tool for AI to query state when uncertain

Fix in this REQ: structured tool_result blocks for every call + a new `get_site_definition` read tool registered in OPERATOR_ACTIONS (plan_tier 'trial' — available to all, read-only, no UI affordance).

**Markdown rendering issue** (operator clarified: this is CHAT rendering, not site content) — assistant messages render as raw markdown text; pasted markdown into the chat input doesn't render formatting. XGD's pattern: `marked@9` for output rendering, TipTap for input editor.

Fix in this REQ:
- Assistant messages render via `react-markdown` (React-idiomatic equivalent of XGD's marked) with GFM extensions, syntax-highlighted code blocks, sanitized links
- Chat input replaced by TipTap editor with markdown extension — paste of markdown renders as formatted text in editor; submission serializes back to markdown for the API

XGD reference: `_markedParser.parse()` pattern in dashboard/static/index.html line 12342 (assistant rendering); TipTap mount line 3976.

<!-- xgd-chat role="user" ts="2026-06-16T14:55:00.000Z" -->
#### You
1 together 2 together 3 across everything 4 I am referring to markdown responses from the AI in the chat not components on the site. Please take a look at the XGD code. We have markdown rendering in the chat response and also when we cut and paste markdown into the text entry window of the chat.

<!-- xgd-chat role="assistant" ts="2026-06-16T14:55:00.000Z" -->
#### Claude
Created REQ-13 — AI state visibility + chat markdown rendering combined per operator direction.

Key deliverables:
1. Structured tool_results in `/api/chat` dispatch — `{ ok: true, applied: {...summary} }` or `{ ok: false, error: {...validation} }` for every tool call, giving AI confirmation without sending full state every turn
2. `get_site_definition` read tool — registered in OPERATOR_ACTIONS, available to all plan tiers, returns current draft
3. Per-turn state summary computed fresh from canonical state for system prompt continuity
4. react-markdown for assistant message rendering with GFM + syntax highlighting + sanitization
5. TipTap editor for chat input with markdown extension and serialization back on submit

XGD pattern adopted directly. Story points 4, priority high (affects AI correctness).

<!-- xgd-turn id="a0309af2-485e-41ba-bd2f-1e577f0ecee3-user" -->

<!-- xgd-chat role="user" ts="2026-06-18T23:05:58.588Z" -->
#### You
Are you ready to implement this?

<!-- xgd-turn id="a0309af2-485e-41ba-bd2f-1e577f0ecee3-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-18T23:08:05.575Z" -->
#### Claude
Before I dive in, let me scan the current state of the relevant code so my implementation plan is grounded.

I've now scanned the relevant code. One thing surprised me that I should flag before implementing:

**The builder-ui is vanilla TypeScript / DOM, not React.** The REQ specifies `react-markdown` and TipTap as the libraries, but looking at `chat-panel.ts` (and `store.ts`, `chat-driver.ts`), the entire builder-ui uses direct DOM APIs — no React anywhere. The XGD reference pattern (`marked@9` from esm.sh + TipTap) is itself vanilla.

Before I dive in, two clarifying questions:

The user declined the questions, so I'll proceed pragmatically. Given the codebase is vanilla TypeScript/DOM (no React), I'll use **`marked` + `DOMPurify`** for assistant markdown rendering (matches XGD's exact reference pattern), and **TipTap** for the input editor as the REQ specifies — TipTap works fine in vanilla JS.

Let me look at a few more files to ground the plan, then start implementing.

Yes, I'm ready. Quick note on adaptations before I start: the builder-ui is vanilla TypeScript/DOM (no React), so the REQ's `react-markdown` translates to **`marked` + `DOMPurify`** (matches XGD's reference pattern more directly). TipTap works fine in vanilla JS and stays as specified. The `<ChatCard>` primitive becomes a vanilla factory function matching the existing `createChatPanel`/`createPreviewPanel` style.

Plan:

**Part 1 — AI state visibility** (`apps/control-app/src/chat.ts`, `apps/control-app/src/operator/registry.ts`)
- Multi-turn loop in `handleChatRequest`: when Anthropic returns `tool_use` blocks, execute them, append a `tool_result` content block to messages, and re-call Anthropic until no more tool calls. Each tool call gets a structured `ok: true | false` result with a summary or validation error.
- Register `get_site_definition` as a system action (plan_tier: trial, no UI route).
- Per-turn system prompt recomputed from canonical state.

**Part 2 — Chat markdown rendering** (`packages/builder-ui/src/components/chat-panel.ts`)
- Add `marked` + `dompurify` deps. Render assistant `content` as sanitized markdown HTML.
- Replace `<textarea>` with TipTap editor (StarterKit + tiptap-markdown). Serializes markdown on submit.

**Part 3 — `<ChatCard>` + tool_result dispatcher** (`packages/builder-ui/src/components/chat-card.ts`, dispatcher in `chat-panel.ts`)
- Vanilla factory `createChatCard(options)` returning `{ root, setBody, setActions, setCollapsed }` with header/body/actions/tone.
- Renderer registry: `kind` discriminator → component. Unknown kinds fall back to markdown.

**Tests** under `tests/test_UAT_FC_REQ-13_*` matching the existing vitest+jsdom pattern.

Starting now — I'll bump the version and commit when complete.

Now I have a complete picture. Let me start by reading the existing ticket body to preserve it, then begin implementation.

I'm ready and have the full picture. Before I start writing code, let me pause for your explicit go-ahead — this REQ pulls in several new npm dependencies and rewrites the chat dispatch loop, so I'd rather confirm than barrel ahead.

**Summary of what I'd do**:

1. **`apps/control-app/src/chat.ts`** — restructure the single-shot Anthropic call into a multi-turn loop. After Anthropic returns `tool_use` blocks, execute each tool (state-edit calls server-side against a working copy of the site definition; system actions through existing handlers), append a structured `tool_result` content block per call, and re-call Anthropic until it stops emitting tool calls. Cap iterations (e.g. 8) for safety.

2. **`apps/control-app/src/operator/registry.ts`** — add `get_site_definition` as a system action. Handler signature needs the current site definition; I'll thread it through `ActionContext`.

3. **`packages/builder-ui/`**:
   - New `components/chat-card.ts` — vanilla factory matching existing pattern.
   - New `components/tool-result-renderers.ts` — kind→renderer registry.
   - Update `components/chat-panel.ts` — replace plaintext rendering with `marked` + `DOMPurify`; replace `<textarea>` with TipTap editor (`@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown`).
   - New deps in `package.json`: `marked`, `dompurify`, `@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown` (+ types).

4. **Tests** under `tests/test_UAT_FC_REQ-13_*` — all 11 listed in the REQ body.

5. **Version bump** (patch) and `[FREE-CODED]` commit, ticket update to `free_coded`.

**Reality check / things to flag**:

- **TipTap markdown round-trip in jsdom**: TipTap is built on ProseMirror, which needs browser DOM APIs. The jsdom environment should handle it, but if it doesn't I may need to test the input editor's behavior through a thinner integration. I'll know within the first test.
- **Server-side validator dependency**: To produce structured `tool_result.ok=true` server-side, the chat handler needs access to `applyToolCall` from `@1stcontact/builder-ui`. The control-app already depends on it, so this is fine.
- **State-edit calls returned to FE**: Currently `stateEditCalls` are passed back to the client for client-side validation. With server-side multi-turn looping, I have two choices: (a) validate AND apply server-side during the loop, returning the final site def, or (b) validate server-side for the `tool_result` summary but still return calls to the FE for re-application. Option (b) preserves the existing client-side validator-of-record contract (REQ-8 §5.3). Going with (b).

Want me to proceed?

<!-- xgd-turn id="7be2e605-6420-4304-9b65-9c77681cf0cc-user" -->

<!-- xgd-chat role="user" ts="2026-06-18T23:27:01.391Z" -->
#### You
Please proceed

<!-- xgd-turn id="7be2e605-6420-4304-9b65-9c77681cf0cc-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-18T23:42:49.343Z" -->
#### Claude
Now let me wire up `get_site_definition`. First I need to thread the current site definition through `ActionContext`.

Now I need to find all the call sites that build an `ActionContext` and add the new `siteDefinition` field.

Now the multi-turn chat loop. This is the biggest change. Let me rewrite `chat.ts`:

Now update the FE chat-driver to consume the new tool result shape (and keep backwards-compat with tests that stub the old shape):

Now update the store to widen `ChatMessage.toolCalls` to include the optional server-side `result`:

Now update `index.ts` exports and the `chat-driver.ts` to point to the right `ChatToolResult` type:

Now run a typecheck on the control-app and builder-ui to catch issues early:

Both clean. Move to task 3.

Now the `ChatCard` primitive:

Now the tool_result dispatcher:

Now the chat panel rewrite. Replacing plaintext with marked+DOMPurify, swap textarea for TipTap:

Also export `renderMarkdownToDom` so renderers and tests can use it:

Now typecheck:

No top-level tsconfig — typechecks are per-package. Let me move on to tests.

The existing REQ-8 test uses strict `toEqual` on the toolCalls shape, which my new response shape breaks. I'll update that test to match partially — REQ-13 explicitly extends the contract:

The existing mock returns the same response forever, which would make my multi-turn loop run until MAX_TOOL_TURNS. Let me update it to terminate properly:

Now run the existing tests to make sure they pass before adding new ones:

Now let me also check the other REQ-8 chat tests pass, then write the new REQ-13 UATs:

All 165 existing tests pass. Now I'll write the REQ-13 UATs. Let me split them into focused files:

Now the first REQ-13 test — structured ok result:

Now the markdown rendering tests:

Now the TipTap tests:

Now the ChatCard tests:

Final test — the dispatcher uses `kind`:

Now run all the REQ-13 tests to find the issues:

All 22 new REQ-13 tests pass on the first run. Let me now run the full suite to confirm nothing regressed:

103 test files, 187 tests, all green. Let me also typecheck both packages and run the bundle build for the FE to make sure nothing breaks there:

Quality run is clean. Let me update the ticket body and commit:

Now update the ticket body. I'll preserve the original content and append a "Free-coded delivery" section:

Now update the ticket to free_coded status with the commit sha and append the delivery section to the body:

The append-list used a literal key `fields.commits` instead of nesting `commits` under `fields`. Let me fix this:

Frontmatter is clean. `commits: [8628a0a...]`, status: `free_coded`. Let me confirm with `xgd ticket get` and finalize tasks:

REQ-13 is complete and committed as **`8628a0a`**. Summary of what shipped:

**Part 1 — AI state visibility** (`apps/control-app/src/chat.ts`, `operator/registry.ts`)
- Multi-turn Anthropic loop (cap 8 iterations). After each `tool_use`, executes the call server-side, builds a structured `tool_result` (`{ok:true, applied:{tool,args,summary}}` or `{ok:false, error:{tool,validation}}`), and re-calls Anthropic until no more tools. System prompt's site-state snapshot is recomputed per iteration from the working site.
- New `get_site_definition` system action (plan_tier=trial). `ActionContext.siteDefinition` threading added; handler returns the current draft, serialized into `applied.data` for the AI.

**Part 2 — Chat markdown rendering** (`packages/builder-ui/src/components/chat-panel.ts`)
- Assistant messages: `marked` (GFM, links → `target=_blank` + `rel="noopener noreferrer"`) → `DOMPurify`. `<script>` and on-event handlers stripped.
- Input editor: TipTap (`@tiptap/core` + `@tiptap/starter-kit` + `tiptap-markdown`). Paste renders markdown formatted, submit serializes back to markdown. Cmd/Ctrl+Enter to send.

**Part 3 — `<ChatCard>` + dispatcher** (`packages/builder-ui/src/components/{chat-card,tool-result-renderers}.ts`)
- `createChatCard(parent, options)` vanilla factory (mirrors REQ's React props). Tones: neutral/info/success/warning/danger. Collapse toggle, actions row.
- `registerToolResultRenderer(kind, fn)` + `renderToolResult(ctx)`. Known kinds route to registered components ([[REQ-21]]/[[REQ-28]] register their own). Unknown kinds and failure results fall back to ChatCard.

**Adaptations from REQ wording** (codebase is vanilla TS/DOM, not React): React-markdown → `marked + DOMPurify`; React `<ChatCard>` → vanilla factory. TipTap kept as specified.

**Tests**: 12 new files, 22 cases under `tests/test_UAT_FC_REQ-13_*`, covering every UAT in the REQ. Updated `test_UAT_FC_REQ-8_chat_endpoint_invokes_anthropic` for the new multi-turn shape. **187/187 tests pass**, `xgd quality run --all-tests` clean.

**Ticket**: REQ-13 status → `free_coded`, `fields.commits = [8628a0a]`, body appended with delivery section preserving the original scope.

<!-- xgd-chat-end -->