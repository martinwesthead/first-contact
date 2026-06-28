---
uid: story-ba9f2715
id: STORY-46
type: story
title: Chat-driven site builder SPA with live preview, AI tool validation, and Anthropic
  proxy
created_by: xgd
created_at: '2026-06-25T01:58:41.731250+00:00'
updated_at: '2026-06-28T21:03:50.632539+00:00'
completed_at: null
last_field_updated: story_kind
status: reconciling
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-6694c60f
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-bbb1bd9c
---

## Story

**As a** small-business site owner whose site is hosted on the 1st Contact platform,
**I want** to open the builder at `app.1stcontact.io/builder` and edit my live site definition by chatting in plain English with an AI assistant on the left while watching my site change in a live preview on the right,
**so that** I can adjust copy, visual settings, sections, and theme without learning a CMS, writing code, or losing track of which change I made.

**As an** operator using the builder day-to-day,
**I want** a two-panel layout in which the chat side collapses to a thin restore rail on the left edge of the preview, the splitter between the two panels can be dragged to resize them, the preview supports mobile / tablet / desktop viewport presets, and all of these layout choices plus my working site definition survive a page reload,
**so that** the builder fits my screen the way I like it and I never lose in-progress edits when I close the tab.

**As the** 1st Contact platform operator,
**I want** every AI tool call to be checked against the framework's module catalog and the site schema before it is applied to my state, and rejected tool calls to be surfaced as a structured error in the chat log without changing the underlying site,
**so that** the AI cannot corrupt my site definition and I can see exactly what it tried and why it was refused.

**As the** 1st Contact platform operator,
**I want** the AI tool list available in any chat session to reflect exactly what my plan tier permits me to do, so that an unauthenticated or trial session sees only the state-edit tools while a paid session additionally sees system-action tools (e.g. `publish_stub`),
**so that** the AI never offers an action my plan does not authorise and the platform's "Operator API parity" principle is enforced uniformly at the tool-surface boundary.

**As the** 1st Contact platform operator,
**I want** the AI to receive a structured result after every tool call and to be able to read the current draft definition back on demand, my assistant's replies rendered as formatted markdown (not raw text), a chat input that understands pasted markdown, and structured tool outcomes shown as consistent cards in the chat log,
**so that** the AI reasons from confirmed state rather than its own inference across a multi-step change, and the chat is legible and visually consistent.

## Description

This story documents the Phase 0 chat-driven site builder: the operator-facing single-page application that turns plain-English nudges into structured edits against a `Site` definition, validated against the framework catalog and `@1stcontact/site-schema` before being applied, with a live in-browser preview that re-renders on every accepted change. It also covers the `/builder` route on `apps/control-app` (served from Workers Static Assets) and the `/api/chat` POST endpoint that proxies the Anthropic Messages API with a plan-tier-filtered tool surface derived from the `OPERATOR_ACTIONS` registry, the framework catalog as a system prompt, and structured extraction of text + tool_use blocks. The `/api/chat` endpoint runs a multi-turn tool loop: after each Anthropic response carrying tool calls it executes each call server-side, feeds a structured `tool_result` back to the model, and recomputes the site-state snapshot in the system prompt from the canonical working definition before the next turn — capped at 8 turns. Assistant replies render as sanitized markdown, the chat input is a rich-text (TipTap) editor with markdown round-trip, and structured tool outcomes render through a reusable card primitive.

In scope:

- A two-panel SPA shell with a chat panel on the left, an iframe preview on the right, and a draggable splitter between them.
- The chat panel collapses to a 32px restore rail that appears on the **left** edge of the preview (where the chat was), and restores to its remembered width on click. Both panel width and collapsed/expanded state are persisted across reload.
- The preview iframe fills its panel's height (does not collapse to a default 150px), and supports three viewport presets — mobile (375px), tablet (768px), and desktop (100% of the pane).
- The eight state-edit AI tools — `set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config` — live in the `OPERATOR_ACTIONS` registry with `category: 'state_edit'`, `plan_tier: 'trial'`, and `ui_route: null` (chat-driven only). `POST /api/chat` constructs the Anthropic tool list by filtering this registry through the session's `plan_tier`, so a trial-plan session receives the eight state-edit tools while a paid-plan session additionally receives paid-tier system-action tools such as `publish_stub`. There is no separate static `TOOL_DEFINITIONS` constant: the registry is the single source of truth.
- Four-layer validation contract: every AI-returned tool call is checked against the framework catalog (module type, version, variants, dials, theme-token names) and the site schema before being applied to the store. Accepted tool calls move the working site forward; rejected tool calls leave state unchanged and append a structured error message (path, expected enum, got, message) to the chat log.
- localStorage persistence of the working site definition and the chat-turn history; on reboot, a previously-edited site survives and chat history is preserved across store re-instantiation.
- A `POST /api/chat` endpoint on `apps/control-app` that proxies the Anthropic Messages API using the bound `CLAUDE_API_KEY` secret (default model `claude-sonnet-4-6`, overrideable via `CLAUDE_MODEL`), with the plan-tier-filtered tool list (see above) and the framework catalog as the system prompt; returns `{text, toolCalls}` extracted from `text` and `tool_use` content blocks. Responds 500 when the API key is unbound and 502 when the upstream call errors or returns a non-2xx response.
- `apps/control-app` routes `/builder` and `/builder/` to the Workers Static Assets binding by rewriting to `/builder.html`; all other paths fall through to the static assets binding first, then the control-app placeholder.
- A starter site (`/starter-sites/1stcontact.json`) is fetched at SPA boot from the same origin; the `?site=` query param selects which starter to load (defaults to `1stcontact`).
- Multi-turn AI tool loop on `/api/chat`: after each Anthropic response that returns tool calls, the worker executes each call, appends a structured `tool_result` content block (`{ok: true, applied: {tool, args, summary}}` on success — `data`/`kind` added when the tool returns structured payload — or `{ok: false, error: {tool, validation}}` on failure, with the failure also flagged `is_error` on the block returned to Anthropic), recomputes the system-prompt site-state snapshot from the canonical working definition, and re-calls Anthropic until no tool calls remain or 8 turns are reached.
- A `get_site_definition` read tool in `OPERATOR_ACTIONS` (`category: 'system_action'`, `plan_tier: 'trial'`, `ui_route: null`) whose handler returns the current draft site definition so the AI can verify canonical state mid-conversation; it is available on every plan tier and its returned payload is surfaced to the model as `applied.data`.
- Assistant chat messages render as markdown (headers, lists, fenced code become DOM elements; links open in a new tab with `rel="noopener noreferrer"`) sanitized so injected `<script>` tags and `on*=` event-handler attributes are stripped; user and system messages remain plaintext.
- The chat input is a rich-text editor that accepts pasted markdown and shows it as formatted text, sends on Cmd/Ctrl+Enter, and serializes its content back to markdown for the `/api/chat` request. The input row lays the editor and Send button out as `[ editor ][ Send ]`: the editor renders as a visible bordered, dark-background field that fills the available width and highlights its border on focus, while the Send button stays compact on its right.
- A reusable chat-card primitive (bordered card with an icon+title header, body slot, optional actions row with click callbacks, optional collapse caret, and one of five tones — neutral / info / success / warning / danger — applying an edge accent) plus a `tool_result` kind→renderer dispatcher: known kinds route to a registered renderer, unknown or untagged successful results fall back to a markdown card showing the summary, and failed results render as a danger-toned card. Downstream REQs register their per-kind renderers through this dispatcher.

Out of scope (deferred per the source ticket):

- D1 save / load of edited site definitions.
- Auth gating on `/builder`; the route is open in this slice.
- Streaming AI narrative text token-by-token (only renders on turn complete).
- The deferred half of the DOC-8 §5.1 tool surface: `set_nav_pattern`, `set_nav_entries`, `attach_asset`, `add_page`, `remove_page`, `reorder_pages`.
- Diff visualisation, click-to-edit in preview, drag-to-reorder, per-module diff rendering (page-level re-render is current granularity), and mobile-friendly builder UI.

## Technical Context

- **Validation contract** is shared with **CAP-32 / Site Definition Schema** (`validateSite`) and **CAP-34 / Framework Module Catalog** (module metas exposed via the browser-safe `@1stcontact/framework/meta` subpath). The builder catalog (`buildFrameworkCatalog()`) compresses the framework metas into a `{modules, themeTokenNames}` shape the chat handler and tool validator can both consume cheaply.
- **In-browser render path**: the preview iframe is filled by `renderSiteToHtml(site)` from `@1stcontact/framework/render` (in-browser variant, no Node-fs runtime imports). The static site generator (CAP-35) and the in-browser preview share the same framework module catalog but use different render entry points.
- **Anthropic API**: the proxy uses `https://api.anthropic.com/v1/messages` by default (overrideable via `ANTHROPIC_API_URL` for testing), the `anthropic-version: 2023-06-01` header, and the API key from the `CLAUDE_API_KEY` secret. The system prompt embeds the catalog and the first 16K characters of the current site definition; messages are filtered to `user`/`assistant` roles only.
- **Plan-tier-derived tool list**: the chat handler extracts a session record (`{session_id, account_id, plan_tier}`) from the request headers (`x-session-id`, `x-account-id`, `x-plan-tier`), defaulting to `{anonymous, trial}` when headers are absent. The Anthropic `tools` array is then computed by `visibleToolSpecs(plan_tier)`, which filters `OPERATOR_ACTIONS` by `tierPermits(session.plan_tier, action.plan_tier)`. Trial sessions see all `plan_tier: 'trial'` actions; paid sessions additionally see `plan_tier: 'paid'` actions; enterprise additionally sees `plan_tier: 'enterprise'` actions.
- **OPERATOR_ACTIONS registry as single source of truth**: the eight state-edit tools previously declared as a static `TOOL_DEFINITIONS` constant in `chat.ts` are gone; they live alongside system actions in `OPERATOR_ACTIONS` and are dispatched through the same registry. State-edit tools retain their REQ-8 client-side validator + application semantics — moving them into the registry is a tool-list-construction change, not an execution-path change.
- **SPA bundle**: `apps/control-app/scripts/build-builder-bundle.mjs` runs esbuild to produce `apps/control-app/public/_assets/builder.js` from `packages/builder-ui/src/spa.ts`. Both the bundle output and the bundled starter site copy under `public/starter-sites/` are gitignored — they rebuild deterministically from the `build`/`deploy`/`dryrun` scripts.
- **Framework-choice divergence from the source ticket**: the source ticket named React components; the implemented slice uses vanilla DOM (`BuilderStore` + DOM factory functions). The user-visible behaviours documented in this story — panel/splitter/viewport UX, tool validation, preview re-render, persistence, the chat endpoint — are framework-agnostic and continue to hold after a hypothetical React rewrite. The matrix documents what the user sees, not the framework choice.
- **DOC-8 §5.3 invalid-dial example**: DOC-8 names `shape: 'cirle'` as the canonical invalid-dial UAT. None of the Phase 0 modules declare a `shape` dial, so the implemented UAT asserts on `size: 'huge'` against the hero (whose `size` dial is `[sm, md, lg]`). Same validator code path, same DOC-8 §6 invariant pinned.
- **Tool validation pre-check note**: the implemented tool validator does NOT separately catalog-validate the `add_module`'s `variant`/`dials` — those land via `validateSite`'s structural rules. The behaviour the user observes (invalid values are rejected, state is unchanged, chat log shows a structured error) is unchanged regardless of which validator layer surfaces the rejection.
- **Multi-turn loop (REQ-13)**: the chat handler loops up to `MAX_TOOL_TURNS = 8`. State-edit calls advance an in-handler working copy of the site (`applyToolCall`) and the success `summary` describes what landed (e.g. `"set dial 'spacingTop' to 'lg' on hero-1"`); the system prompt is rebuilt each turn from that working copy, so continuation accuracy holds across long sessions. `get_site_definition` is dispatched as a system action and its payload is surfaced to the AI via the legacy no-`kind` path (`applied.data`), while any system action returning a `payload.kind` string surfaces `applied.data` + `applied.kind` on `body.toolCalls` for the FE dispatcher.
- **Markdown rendering (REQ-13)**: assistant messages go through `marked` (v14, GFM on, a custom link renderer adding `target="_blank" rel="noopener noreferrer"`) then `DOMPurify.sanitize`; user/system messages use `textContent`. The chat input is a TipTap editor (`StarterKit` + `tiptap-markdown` with `html: false`), serializing back to markdown on submit.
- **Chat-input styling (BUG-1)**: `apps/control-app/public/builder.html` styles the TipTap editor DOM introduced by REQ-13 so the input is visible and correctly laid out — `.fc-chat__editor` (`flex: 1 1 auto`, `min-width: 0`, dark background, border, `:focus-within` highlight) wraps `.fc-chat__editor-content` (min/max height, padding, text colour, `outline: none`) inside a `.fc-chat__input` flex row with the Send button pinned compact on the right. The stale `.fc-chat__textarea` rule from the pre-REQ-13 plain-textarea input is removed; without these rules the editor wrapper collapsed to zero size and the Send button took over the row.
- **ChatCard + dispatcher (REQ-13)**: implemented as the vanilla-DOM `createChatCard` factory and a `kind → renderer` registry (`registerToolResultRenderer` / `renderToolResult`), not the React `<ChatCard>`/`react-markdown` the source ticket named. The user-visible behaviours (card shell + tones + collapse, markdown fallback, danger card on failure, per-kind routing) are framework-agnostic — the matrix documents what the user sees, not the framework choice (consistent with the divergence note above).

## Dependencies

- **CAP-32 / Site Definition Schema** — `validateSite()` is the schema-validation half of the four-layer contract; `Site`/`ModuleInstance`/`Page` types are the canonical site-definition shape.
- **CAP-33 / Framework Theme Tokens & CSS Generation** — the in-browser preview consumes generated theme CSS so style edits visually land in the iframe.
- **CAP-34 / Framework Module Catalog** — the chrome and content modules are what the catalog enumerates and what the preview renders; the `@1stcontact/framework/meta` browser-safe subpath is the bundle bridge.
- **Operator API (REQ-9)** — the `OPERATOR_ACTIONS` registry, the plan-tier authorization middleware, and the `tierPermits` ordering that filters the tool list before each Anthropic request.

## Story Points

3