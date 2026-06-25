---
uid: story-ba9f2715
id: STORY-46
type: story
title: Chat-driven site builder SPA with live preview, AI tool validation, and Anthropic
  proxy
created_by: xgd
created_at: '2026-06-25T01:58:41.731250+00:00'
updated_at: '2026-06-25T01:58:41.731250+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-6694c60f
  story_kind: feature
  story_points: 3
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

## Description

This story documents the Phase 0 chat-driven site builder: the operator-facing single-page application that turns plain-English nudges into structured edits against a `Site` definition, validated against the framework catalog and `@1stcontact/site-schema` before being applied, with a live in-browser preview that re-renders on every accepted change. It also covers the `/builder` route on `apps/control-app` (served from Workers Static Assets) and the `/api/chat` POST endpoint that proxies the Anthropic Messages API with the full v1 tool surface, the framework catalog as a system prompt, and structured extraction of text + tool_use blocks.

In scope:

- A two-panel SPA shell with a chat panel on the left, an iframe preview on the right, and a draggable splitter between them.
- The chat panel collapses to a 32px restore rail that appears on the **left** edge of the preview (where the chat was), and restores to its remembered width on click. Both panel width and collapsed/expanded state are persisted across reload.
- The preview iframe fills its panel's height (does not collapse to a default 150px), and supports three viewport presets — mobile (375px), tablet (768px), and desktop (100% of the pane).
- The full v1 AI tool surface: `set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`.
- Four-layer validation contract: every AI-returned tool call is checked against the framework catalog (module type, version, variants, dials, theme-token names) and the site schema before being applied to the store. Accepted tool calls move the working site forward; rejected tool calls leave state unchanged and append a structured error message (path, expected enum, got, message) to the chat log.
- localStorage persistence of the working site definition and the chat-turn history; on reboot, a previously-edited site survives and chat history is preserved across store re-instantiation.
- A `POST /api/chat` endpoint on `apps/control-app` that proxies the Anthropic Messages API using the bound `CLAUDE_API_KEY` secret (default model `claude-sonnet-4-6`, overrideable via `CLAUDE_MODEL`), with the v1 tool surface as tool definitions and the framework catalog as the system prompt; returns `{text, toolCalls}` extracted from `text` and `tool_use` content blocks. Responds 500 when the API key is unbound and 502 when the upstream call errors or returns a non-2xx response.
- `apps/control-app` routes `/builder` and `/builder/` to the Workers Static Assets binding by rewriting to `/builder.html`; all other paths fall through to the static assets binding first, then the control-app placeholder.
- A starter site (`/starter-sites/1stcontact.json`) is fetched at SPA boot from the same origin; the `?site=` query param selects which starter to load (defaults to `1stcontact`).

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
- **SPA bundle**: `apps/control-app/scripts/build-builder-bundle.mjs` runs esbuild to produce `apps/control-app/public/_assets/builder.js` from `packages/builder-ui/src/spa.ts`. Both the bundle output and the bundled starter site copy under `public/starter-sites/` are gitignored — they rebuild deterministically from the `build`/`deploy`/`dryrun` scripts.
- **Framework-choice divergence from the source ticket**: the source ticket named React components; the implemented slice uses vanilla DOM (`BuilderStore` + DOM factory functions). The user-visible behaviours documented in this story — panel/splitter/viewport UX, tool validation, preview re-render, persistence, the chat endpoint — are framework-agnostic and continue to hold after a hypothetical React rewrite. The matrix documents what the user sees, not the framework choice.
- **DOC-8 §5.3 invalid-dial example**: DOC-8 names `shape: 'cirle'` as the canonical invalid-dial UAT. None of the Phase 0 modules declare a `shape` dial, so the implemented UAT asserts on `size: 'huge'` against the hero (whose `size` dial is `[sm, md, lg]`). Same validator code path, same DOC-8 §6 invariant pinned.
- **Tool validation pre-check note**: the implemented tool validator does NOT separately catalog-validate the `add_module`'s `variant`/`dials` — those land via `validateSite`'s structural rules. The behaviour the user observes (invalid values are rejected, state is unchanged, chat log shows a structured error) is unchanged regardless of which validator layer surfaces the rejection.

## Dependencies

- **CAP-32 / Site Definition Schema** — `validateSite()` is the schema-validation half of the four-layer contract; `Site`/`ModuleInstance`/`Page` types are the canonical site-definition shape.
- **CAP-33 / Framework Theme Tokens & CSS Generation** — the in-browser preview consumes generated theme CSS so style edits visually land in the iframe.
- **CAP-34 / Framework Module Catalog** — the chrome and content modules are what the catalog enumerates and what the preview renders; the `@1stcontact/framework/meta` browser-safe subpath is the bundle bridge.

## Story Points

3
