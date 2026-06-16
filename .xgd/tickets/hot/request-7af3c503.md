---
uid: request-7af3c503
id: REQ-17
type: request
title: 'App shell: top-bar tabs + avatar menu + per-tab chat panel'
created_by: xgd
created_at: '2026-06-16T23:20:25.421877+00:00'
updated_at: '2026-06-16T23:20:25.421877+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  story_points: 5
  priority: high
  auto_merge_back: true
  needs_review: false
---

# App shell: top-bar tabs + avatar menu + per-tab chat panel

## Problem

Every per-site surface (Builder, Settings, Assets, Revisions, Leads) needs a consistent host: a top bar with tab navigation, a global utility menu, and a chat panel docked into each tab. Today the control-app has only `/builder` with chat+preview split; there is no tabbed shell, no avatar menu, and no way for other tab REQs (Assets, Settings, Revisions) to dock their content.

This REQ delivers the shell. Tab content REQs (REQ-16 Assets, future REQ-UI-SETTINGS, etc.) plug into the shell's tab content area.

## Decisions already made (per CHAT-9)

- **Top bar tabs**: `Builder | Settings | Assets | (Revisions | Leads later)`. Per-site context — every tab operates on the current site.
- **Top-right global menu**: avatar trigger (initials), opens dropdown with `Sites | Account | Sign out`. Future Help / Docs / Notifications / API tokens / Activity log slot in naturally.
- **Chat panel per tab**:
  - Each `(site × tab)` pair has its own chat — Builder chat ≠ Settings chat ≠ Assets chat.
  - Open / collapsed state persisted in `localStorage` per tab.
  - Defaults: **open** on Builder + Assets, **collapsed** on Settings and future read-mostly tabs.
- **Routing**: `/app/<site>/<tab>` or similar. Refresh-friendly. Direct-link to a tab.
- Avatar visual: initials-in-circle, dropdown on click. Hamburger glyph rejected.

## Scope

### IN

- New `apps/control-app/public/app.html` shell with:
  - Top bar: site display name on the left, tab bar centred, avatar dropdown right.
  - Tab content area: full-height region below the top bar. Hosts the per-tab content via a registered factory.
  - Chat panel: docked into the tab content area (right side by convention), per-tab open/collapsed state with `localStorage` persist key `1stcontact_app_chat_state_v1` keyed by `(site, tab)`.
- New routes on the control-app Worker:
  - `GET /app/<site>/<tab>` → serves `app.html` and passes site/tab as data attributes on the root element.
  - `GET /app` → redirects to `/app/<site>/builder` for the default site.
- Tab framework in `packages/builder-ui/src/`:
  - `createAppShell(parent, options)` → mounts the top bar, tab bar, avatar menu, content area, and chat panel.
  - Tab registration API: `appShell.registerTab(id, {label, defaultChatOpen, factory})`. Factory receives the content area DOM element + a `chatSlot` reference.
  - Avatar dropdown component (vanilla DOM, no framework).
  - Chat panel component, mounted by the shell, controllable per tab.
- Migrate the existing `/builder` chat+preview surface to register as the `builder` tab. The current `/builder` route can remain as an alias or redirect to `/app/<site>/builder`.
- Tab routing wired to `history.pushState` for back/forward support.

### OUT (deferred to other REQs)

- **Tab contents** for `Settings`, `Assets`, `Revisions`, `Leads` — each is its own REQ (REQ-UI-SETTINGS, REQ-16 Assets, REQ-PUBLISH-REVISIONS, etc.).
- **Auth / Account** — the `Account` and `Sign out` items in the avatar dropdown wire to placeholder routes until `REQ-AUTH` lands.
- **Multi-site selector** — `Sites` submenu shows the current site only in v1; full multi-site listing waits for the site-management REQ.
- **Chat session persistence to D1** — this REQ scopes the chat *panel UI and open/collapsed state only*. Persistent chat threads with cross-session transcript access live in **REQ-CHAT-CONTEXT** (discussed in CHAT-9, not yet drafted).
- **Highlight-to-chat ("Ask AI") floating control** — separate **REQ-CHAT-HIGHLIGHT** (discussed in CHAT-9, not yet drafted).
- **`get_visible_context()` tool** — lives in REQ-CHAT-CONTEXT; this REQ exposes a registration hook the chat tool will use later.

## Dependencies

- None blocking. This REQ is the foundation for Settings / Assets / Revisions tab REQs.

## Downstream consumers (must land after this REQ)

- **REQ-16** (Assets tab) — registers `id: "assets"`, default chat open.
- **REQ-UI-SETTINGS** — registers `id: "settings"`, default chat collapsed.
- **REQ-PUBLISH-REVISIONS** — registers `id: "revisions"`, default chat collapsed.
- **REQ-CHAT-CONTEXT** — wires the chat panel to per-tab provider registry.

## Acceptance criteria

1. Operator navigates to `/app` and is redirected to `/app/<site>/builder`.
2. Top bar shows site display name (left), tabs `Builder | Settings | Assets` (centre — Revisions/Leads slots ready but disabled in v1), avatar with initials (right).
3. Clicking a tab swaps the content area to that tab's registered factory output without a full page reload; URL updates via `pushState`.
4. Browser back/forward navigates between tabs.
5. Avatar click opens a dropdown with `Sites | Account | Sign out`. `Sites` shows current site marked, others placeholder; `Account` and `Sign out` link to placeholders.
6. Chat panel mounts inside the tab content area. Toggling open/collapsed persists to `localStorage`, scoped to `(site, tab)`.
7. Tab defaults match spec: Builder + Assets open chat by default; Settings collapsed.
8. The existing `/builder` route either continues to work (as alias) or redirects to `/app/<site>/builder`.
9. Tab registration API accepts unknown tab ids gracefully (no-op + console warning) so downstream REQs can register independently.

## Story points

5. Shell scaffolding + tab registration API + routing + avatar dropdown + chat panel mount + persisted state.

## Test plan

UAT tests `test_UAT_FC_<TICKET-ID>_*.ts`. Vitest + Miniflare for Worker routes; jsdom + happy-dom for shell components.

- `_route_redirect.ts` — `/app` redirects to `/app/<site>/builder`.
- `_tab_switch.ts` — register two tabs, click between them, content swaps and URL updates.
- `_back_forward.ts` — `history.back()` after a tab switch restores the previous tab.
- `_chat_persist.ts` — toggle chat in Settings tab; switch to Builder; switch back; collapsed state restored.
- `_chat_defaults.ts` — first visit to Builder shows chat open; first visit to Settings shows chat collapsed.
- `_avatar_menu.ts` — click avatar, dropdown opens with the three items; click outside closes it.

## Design discussion — excerpts from session 2026-06-16

These excerpts came from the asset-management design conversation. The shell decisions originated in CHAT-9 ("Builder"); references below pull the shell-relevant fragments into this REQ so an implementer working only on the shell has them inline.

> **User (CHAT-9):** How about a top right hamburger menu with account as one option and potentially different sites could be selected there. I'm sure we will find something else that needs a home that is not site specific that would also naturally end up there

> **Assistant (CHAT-9):** Top-right hamburger menu (global utility): Sites, Account, Sign out. Top bar tabs (per-site): Builder | Settings | Assets | (Revisions | Leads later). Chat panel — per-tab open/closed default, persisted per tab in localStorage. Defaults: chat open on Builder + Assets; collapsed on Settings + future read-mostly tabs.

> **User (CHAT-9):** Sure we can do an avatar menu.

> **User (current session, on REQ-16 framing):** Take a look at the conversation in the chat called "Builder" we have just decided on a top level tab navigation structure much like XGD. This asset manager would be one of those tabs. Also note the chat window that we are embedding in every tab.

> **Assistant (current session):** The app shell is a prerequisite that doesn't yet exist. CHAT-9 enumerated REQ-UI-APP-SHELL as the work-to-draft but never created the ticket. The Assets tab can't dock without the shell. Two ways forward — (a) draft shell first then assets; (b) develop assets against a stub host. Lean (a); the shell unlocks Settings, Assets, and Revisions all at once.

### Related decisions deferred to other REQs

- Persistent chat sessions, cross-session transcripts, and the `get_visible_context()` tool → **REQ-CHAT-CONTEXT** (discussed CHAT-9, not yet drafted).
- Highlight-to-floating-button "send to chat" affordance → **REQ-CHAT-HIGHLIGHT** (discussed CHAT-9, not yet drafted).
- Magic-link auth wiring for the avatar `Sign out` and `Account` items → **REQ-AUTH** (not yet drafted).
