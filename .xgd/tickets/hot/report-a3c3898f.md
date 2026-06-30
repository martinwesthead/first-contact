---
uid: report-a3c3898f
id: REPORT-870
type: report
title: 'Reconciliation Plan: BUNDLE-9 (REQ-23 + REQ-24 + REQ-25 + REQ-50 + BUG-8)'
created_by: xgd
created_at: '2026-06-30T04:03:56.300792+00:00'
updated_at: '2026-06-30T04:45:11.898058+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-44f53d53
  anchor_uid: bundle-44f53d53
  items:
  - index: 1
    component: Chat & Reference-Doc Persistence Schema (D1)
    item_type: feature
    story_points: 2
    dependencies: []
    description: 'REQ-23 (commit b6dd188f). New D1 migrations 0006/0007/0008 plus
      reverse-order down migrations: chat_sessions (FK sites ON DELETE CASCADE, idx_chat_sessions_site_last),
      chat_messages (FK chat_sessions CASCADE, UNIQUE(session_id, ord), idx_chat_messages_session_ord)
      + chat_messages_fts FTS5 virtual table with AI/AD/AU sync triggers, reference_docs
      (summary + toc_json + body, idx_reference_docs_kind) + reference_docs_fts FTS5
      + sync triggers. TypeScript record types (ChatRole, ChatSessionRecord, ChatMessageRecord(+Parsed),
      ChatMessageToolCall, ReferenceDocRecord(+Parsed), ReferenceDocTocEntry) added
      to packages/site-schema/src/db-types.ts. Cascades sites->sessions->messages->FTS;
      reversible migrations leaving REQ-10 (accounts/sites/revisions) schema intact.'
    justification: No existing story documents chat persistence. STORY-63 (story-a3283461,
      Multi-site D1 data model) explicitly lists 'magic-link/session tables' as out-of-scope/deferred
      and covers only accounts/sites/revisions/slug. This is a genuinely new persistence
      capability bucket (per-site chat sessions + platform reference-doc library with
      FTS5), so a new feature story is required rather than an upgrade.
    story_uid: story-1e174b7c
  - index: 2
    component: Chat Session & Reference-Doc HTTP API (control-app)
    item_type: feature
    story_points: 3
    dependencies:
    - 1
    description: 'REQ-24 endpoints (commit 85705dd; chat-db.ts + chat-routes.ts, mounted
      from index.ts). Eight JSON endpoints: POST/GET /api/sites/:siteId/chats (create
      + paginated site-scoped list ordered by last_message_at DESC), GET/POST /api/chats/:sessionId/messages
      (tail read with no ?before, before=:ord pagination ascending; atomic append
      that allocates next ord and updates session denorms last_message_at/message_count/updated_at,
      transactional via D1.batch), DELETE /api/chats/:sessionId (cascade delete +
      R2 attachment sweep walking tool_calls_json for assets/ keys), PATCH /api/chats/:sessionId
      (operator title edit), GET /api/reference-docs (list slug/title/summary/kind),
      GET /api/reference-docs/:slug?section= (full body or single section). FTS5 search
      joins through chat_sessions.site_id for per-site scoping, with token quoting
      so free-text queries don''t crash on FTS5 operators.'
    justification: No existing story covers these REST resource endpoints. STORY-51
      (story-a07c8ed3, Operator action dispatch) and CAP-43's charter are specifically
      the typed operator-action registry + SSE channel (/api/operator/*), a distinct
      namespace and dispatch pattern; these chat-session CRUD/pagination/reference-doc
      endpoints are a separate API surface. New capability gap => feature.
    story_uid: story-721e8feb
  - index: 3
    component: 'Builder chat handler: server-resident history + tail-prime + AI memory
      tools'
    item_type: upgrade
    story_points: 3
    dependencies:
    - 1
    - 2
    target_story_ids:
    - story-ba9f2715
    description: 'REQ-24 chat.ts refactor (commit 85705dd). Replaces the client-sends-full-history
      model with server-resident history: POST /api/chat now accepts {sessionId, userMessage,
      siteDefinition, frameworkCatalog} and rejects a body containing history with
      400. Server appends the user message, loads the session tail by walking back
      from latest ord until >= CHAT_TAIL_CHARS (default 5000, configurable), primes
      Anthropic with the tail as messages and the reference-doc index in the system
      prompt, and exposes 4 new server-executed memory tools (search_transcripts,
      read_session_range, list_reference_docs, read_reference_doc) alongside the existing
      builder-action tools. Memory-tool calls execute server-side, are scoped per-site
      via chat_sessions.site_id (cross-site session_id => 404 to the model), and do
      NOT surface as FE tool-pane events. On the first turn the server derives a one-line
      title and PATCHes the session. SSE streaming parity is preserved. (10 legacy
      chat-handler tests REQ-8/9/13/21/30/38 were migrated from the history body to
      the new shape.)'
    intent_delta_summary: STORY-46's Anthropic-proxy chat handler evolves from client-sent
      full history to durable server-resident tail-prime with AI memory tools; the
      POST /api/chat request contract changes and four read-only memory tools are
      added, while SSE streaming and plan-tier tool gating are preserved.
    acceptance_criteria_changes:
      modify:
      - 'AC-486 (POST /api/chat streams the Anthropic turn as SSE): request body is
        now {sessionId, userMessage, siteDefinition, frameworkCatalog}; the server
        reads stored session messages (no client history); SSE streaming token/tool_call/tool_result/done/error
        preserved.'
      add:
      - POST /api/chat rejects a body containing a history field (400); server is
        the source of truth for transcript history.
      - The Anthropic call is primed with the session tail (>= CHAT_TAIL_CHARS, default
        5000, contiguous most-recent messages), not the whole transcript.
      - Four server-executed AI memory tools (search_transcripts, read_session_range,
        list_reference_docs, read_reference_doc) are available; they run server-side,
        are scoped to the request's site (other-site session_id returns 404 to the
        model), and do not emit FE tool-pane events.
      - On the first user turn the server auto-generates a one-line session title
        and persists it; subsequent turns do not regenerate it.
      remove: []
    justification: Extends STORY-46's existing chat/Anthropic-proxy capability bucket
      in place (the same POST /api/chat handler and tool surface); no new capability
      bucket and no parallel implementation. The memory tools are exposed and executed
      by the existing chat handler, so they belong with this story rather than a new
      AI-tools story. Modifies AC-486 and adds ACs on the existing chat surface.
    story_uid: story-ba9f2715
  - index: 4
    component: 'Builder UI: durable server-backed chat sessions, infinite scroll,
      auto-session, fetch binding'
    item_type: upgrade
    story_points: 3
    dependencies:
    - 2
    - 3
    target_story_ids:
    - story-ba9f2715
    description: 'REQ-25 net-landed (commits 46109cd, 7e91942 second pass, b2ece207
      backend-reality fix) + BUG-8 (commit efc642cc). Replaces the in-memory BuilderStore.chatHistory
      / localStorage transcript with an API-backed paginated store (new chats-api.ts
      client; store gains activeSessionId, loadedMessages, loadedFromOrd, hasMoreOlder,
      prependOlderMessages). Tail loads on boot; infinite-scroll upward via an IntersectionObserver
      top sentinel with scroll-position anchoring (withScrollAnchor compensates the
      height delta after prepend); per-site isolation; only activeSessionId persists
      in localStorage keyed by siteId. chat-driver POSTs {sessionId, userMessage}
      (no history); REQ-37 pending-failure reinjection is persisted via POST /api/chats/:id/messages
      so the server tail-load picks it up. NET LANDED UI is a single auto-managed
      session per (site, browser): ensureActiveSession picks the stored id, else most-recent,
      else auto-creates. siteId is derived from the starter site name (site_1stcontact,
      matching the 0005 seed); boot/mid-send failures append an in-panel system error
      message (appendBootErrorMessage) instead of silent console.warn. BUG-8: the
      three builder-ui fetch defaulting sites use globalThis.fetch.bind(globalThis)
      so real-browser boot does not throw ''fetch called on an object that does not
      implement interface Window''.'
    intent_delta_summary: STORY-46's builder chat transcript moves from in-memory/localStorage
      to durable server-backed sessions with tail-load on boot and infinite-scroll-up;
      the UI auto-manages a single session per (site, browser); boot failures are
      surfaced in-panel and the default fetch is bound so chat boot works in a real
      browser.
    acceptance_criteria_changes:
      modify:
      - 'AC-585 (Chat-turn history is persisted to browser storage and restored on
        builder re-mount): history is now server-resident in D1 and loaded from the
        API as the session tail on boot; only the active session id is kept in localStorage
        (keyed by siteId), and the in-memory-only transcript behavior is gone.'
      add:
      - Scrolling to the top of the message list loads the next page of older messages
        (?before=loadedFromOrd) and visually anchors scroll position so the view does
        not jump; when no older messages remain, hasMoreOlder is false and no further
        requests fire.
      - 'The builder auto-manages a single chat session per (site, browser): on boot
        it reuses the stored active session, else the most recent, else auto-creates
        one, and that session persists across reloads; the chat panel exposes no session
        list / new-chat / title-edit / delete affordances in v1.'
      - Boot or mid-send chat-session failures surface as an in-panel system message
        naming the site, rather than a silently broken panel.
      - The builder's default fetch is bound to globalThis so chat boot and sends
        succeed in a real browser without an unbound-fetch TypeError (BUG-8).
      remove: []
    justification: Extends STORY-46's existing browser-side chat-persistence behavior
      in place (the same chat panel and store), replacing localStorage transcript
      persistence with the server-backed store; no new capability bucket and no parallel
      chat surface. BUG-8 is a bug fix (treated as upgrade) on the same builder-ui
      chat wiring introduced by this REQ, folded in as a robustness AC. Targets STORY-46
      along the client axis, disjoint from item 3's server-axis AC changes (item 3
      touches AC-486; item 4 touches AC-585).
    story_uid: story-ba9f2715
  - index: 5
    component: 'Monorepo: @gendev npm scope + productization package skeletons'
    item_type: upgrade
    story_points: 2
    dependencies: []
    target_story_ids:
    - story-067dc2f8
    description: 'REQ-50 (commit 3847ff00). Mechanical, no-runtime-behavior-change
      restructure of the monorepo: every workspace package''s npm scope renamed @1stcontact/*
      -> @gendev/* (package name fields, dependency keys, CI/deploy workflow references,
      all import statements, pnpm --filter scripts; pnpm-lock regenerated). The product
      name ''1stcontact'' and sites/1stcontact/site.json are unchanged. packages/ui-kit
      (a stub) is deleted. Four empty productization package skeletons are seeded
      under packages/ (api-contracts, auth, billing, portal-ui), each with package.json
      named @gendev/<name>, tsconfig.json, README describing its role + design-doc
      links, and a placeholder src/index.ts exporting nothing real. apps/control-app,
      apps/public-site builds and sites/1stcontact generated static output are byte-stable
      across the rename (modulo scope strings).'
    intent_delta_summary: STORY-38's monorepo substrate gains documentation that workspace
      packages use the @gendev npm scope (renamed from @1stcontact) and that four
      empty productization package skeletons (auth, billing, portal-ui, api-contracts)
      exist with ui-kit removed, with no change to build/deploy or generated-site
      behavior.
    acceptance_criteria_changes:
      modify: []
      add:
      - All workspace packages use the @gendev/* npm scope (renamed from @1stcontact/*);
        no @1stcontact import survives in apps/, packages/, or tools/ source. The
        product name 1stcontact and its slug are unchanged.
      - Four productization package skeletons exist under packages/ (api-contracts,
        auth, billing, portal-ui), each with a @gendev/<name> package.json, tsconfig.json,
        README, and an empty src/index.ts (no implementation); the former packages/ui-kit
        stub is removed.
      - apps/control-app and apps/public-site build, and sites/1stcontact generates
        static output, identically pre/post rename (modulo scope strings).
      remove: []
    justification: 'Extends STORY-38''s existing monorepo-substrate capability bucket:
      the npm scope and the set of workspace packages are structural properties of
      the monorepo this story already documents (AC-389 ''identifiers align to the
      1stcontact slug'', toolchain/lockfile ACs). No new capability bucket and no
      new runtime behavior (REQ-50 is explicitly a no-behavior rename + empty skeletons),
      so this is an in-place upgrade, not a feature. Targets STORY-38 (story-067dc2f8).'
    story_uid: null
---

# Reconciliation Plan: BUNDLE-9

**Mode**: commits
**Anchor**: bundle-44f53d53 (BUNDLE-9 — REQ-23 + REQ-24 + REQ-25 + REQ-50 + BUG-8)
**Subject epic**: bundle-44f53d53 (bundle is a first-class intent type; child intents covered via commits evidence)

Ground truth is the 12 free-coded commits on this branch. Stories/ACs are created or extended to match what the diffs actually do.

## Behavior Inventory

```yaml
behavior_inventory:
  source: "commits-mode: 12 free-coded commits (REQ-23, REQ-24, REQ-25 x3, REQ-50, BUG-8 + version bumps)"
  features:
    - name: "REQ-23 — chat/reference-doc persistence schema (b6dd188f)"
      entry_point: "db/migrations/0006-0008, packages/site-schema/src/db-types.ts"
      behaviors:
        - "chat_sessions table (FK sites CASCADE, idx_chat_sessions_site_last)"
        - "chat_messages table (FK chat_sessions CASCADE, UNIQUE(session_id,ord), idx_chat_messages_session_ord)"
        - "chat_messages_fts FTS5 + AI/AD/AU sync triggers"
        - "reference_docs (summary+toc_json+body, idx_reference_docs_kind) + reference_docs_fts FTS5 + triggers"
        - "reversible down migrations; REQ-10 schema preserved; cascades sites->sessions->messages->FTS"
        - "TS record types added to db-types.ts (snake_case convention)"
    - name: "REQ-24 — chat session HTTP API (85705dd: chat-db.ts, chat-routes.ts)"
      entry_point: "apps/control-app/src/chat-routes.ts (mounted from index.ts)"
      behaviors:
        - "POST/GET /api/sites/:siteId/chats (create + site-scoped paginated list)"
        - "GET/POST /api/chats/:id/messages (tail read, before=ord pagination, atomic append + ord allocation + denorm update via D1.batch)"
        - "DELETE /api/chats/:id (cascade + R2 attachment sweep) ; PATCH title"
        - "GET /api/reference-docs ; GET /api/reference-docs/:slug?section= (section slicing)"
        - "FTS5 search joins chat_sessions.site_id for per-site scope; token quoting for safe free-text queries"
    - name: "REQ-24 — chat.ts tail-prime + memory tools refactor (85705dd)"
      entry_point: "apps/control-app/src/chat.ts"
      behaviors:
        - "POST /api/chat takes {sessionId,userMessage,siteDefinition,frameworkCatalog}; rejects history with 400"
        - "server appends user msg, loads tail >= CHAT_TAIL_CHARS (default 5000), primes Anthropic"
        - "4 server-executed memory tools (search_transcripts, read_session_range, list_reference_docs, read_reference_doc), per-site scoped, not surfaced as FE tool events"
        - "first-turn one-line title generation + PATCH; SSE streaming parity preserved"
        - "10 legacy chat-handler tests migrated to new request shape"
    - name: "REQ-25 — builder UI durable chat sessions (46109cd -> 7e91942 -> b2ece207)"
      entry_point: "packages/builder-ui/src/{chats-api,store,chat-driver,main,spa}.ts, components/chat-panel.ts"
      behaviors:
        - "API-backed paginated store replaces in-memory chatHistory/localStorage transcript"
        - "tail-load on boot; infinite-scroll-up via IntersectionObserver sentinel + scroll anchoring"
        - "per-site isolation; only activeSessionId in localStorage (keyed by siteId)"
        - "NET LANDED: single auto-managed session per (site,browser) — session list/new/title/delete were added (46109cd) then REMOVED (7e91942 second pass)"
        - "siteId derived from starter site name (site_1stcontact); migrations_dir wired; in-panel boot-error surface (b2ece207)"
    - name: "BUG-8 — default fetch binding (efc642cc)"
      entry_point: "packages/builder-ui/src/{chat-driver,chats-api,main}.ts"
      behaviors:
        - "three fetch-defaulting sites use globalThis.fetch.bind(globalThis) so real-browser boot/send don't throw unbound-fetch TypeError"
    - name: "REQ-50 — @gendev scope + productization skeletons (3847ff00)"
      entry_point: "all package.json, imports, CI workflows; packages/{api-contracts,auth,billing,portal-ui}"
      behaviors:
        - "@1stcontact/* -> @gendev/* across source/manifests/CI/imports/filter scripts; product name unchanged"
        - "packages/ui-kit deleted; four empty productization package skeletons seeded"
        - "no runtime behavior change; builds + generated 1stcontact site byte-stable"
```

## Coverage Map

```yaml
coverage_map:
  - feature: "REQ-23 chat/reference-doc persistence schema"
    status: uncovered
    existing_stories: ["STORY-63 (story-a3283461, Multi-site D1 data model)"]
    gaps: ["STORY-63 explicitly defers session tables; no story documents chat_sessions/messages/reference_docs, FTS5 sync, cascades, indices"]
    -> item 1 (feature)
  - feature: "REQ-24 chat session + reference-doc REST API"
    status: uncovered
    existing_stories: ["STORY-51 (story-a07c8ed3, Operator action dispatch)"]
    gaps: ["STORY-51 / CAP-43 cover the /api/operator/* typed-action registry + SSE only; chat-session CRUD/pagination/reference-doc REST endpoints are a separate surface"]
    -> item 2 (feature)
  - feature: "REQ-24 chat.ts tail-prime + memory tools"
    status: partial
    existing_stories: ["STORY-46 (story-ba9f2715)"]
    existing_acs: ["AC-486 (POST /api/chat SSE)", "AC-585 (browser-storage history)"]
    gaps: ["AC-486 describes the old request/handler; no ACs for server-resident tail-prime, memory tools, no-history rejection, first-turn title"]
    -> item 3 (upgrade STORY-46, server axis: AC-486 + new server ACs)
  - feature: "REQ-25 builder UI durable sessions + BUG-8"
    status: partial
    existing_stories: ["STORY-46 (story-ba9f2715)"]
    existing_acs: ["AC-585 (browser-storage history)"]
    gaps: ["AC-585 is in-memory/localStorage; no ACs for server-backed store, infinite scroll, auto-session, boot-error surface, fetch binding"]
    -> item 4 (upgrade STORY-46, client axis: AC-585 + new client ACs)
  - feature: "REQ-50 @gendev scope + productization skeletons"
    status: partial
    existing_stories: ["STORY-38 (story-067dc2f8, Monorepo + deploy)"]
    existing_acs: ["AC-389 (identifiers align to 1stcontact slug)", "toolchain/lockfile ACs"]
    gaps: ["no AC documents the @gendev npm scope or the seeded productization package skeletons / ui-kit removal"]
    -> item 5 (upgrade STORY-38)
```

## Plan Items

| # | Component | Type | Pts | Deps | Target |
|---|-----------|------|-----|------|--------|
| 1 | Chat & reference-doc persistence schema (D1) | feature | 2 | - | new (CAP-50) |
| 2 | Chat session & reference-doc HTTP API | feature | 3 | 1 | new (CAP-43-adjacent) |
| 3 | Chat handler: server-resident history + tail-prime + memory tools | upgrade | 3 | 1,2 | STORY-46 (server axis, AC-486) |
| 4 | Builder UI durable sessions + infinite scroll + fetch binding (incl. BUG-8) | upgrade | 3 | 2,3 | STORY-46 (client axis, AC-585) |
| 5 | @gendev scope + productization package skeletons | upgrade | 2 | - | STORY-38 |

Totals: 5 items (feature: 2, upgrade: 3), 13 points.

## Observations & Judgment Calls

- **REQ-25 landed state, not intermediate.** Session-management UI (list / new-chat / inline title edit / delete) was added in 46109cd then deliberately REMOVED in the 7e91942 second pass per operator feedback. Item 4 documents the NET landed behavior — a single auto-managed session per (site, browser) — and explicitly does NOT create ACs for the dropped multi-session affordances. The backing API/store machinery for multi-session remains (items 1-3) but is not UI-exposed in v1.
- **STORY-46 targeted by two upgrade items along disjoint axes.** Item 3 (server) modifies AC-486 and adds server-side ACs; item 4 (client) modifies AC-585 and adds client-side ACs. The AC deltas are disjoint so the two items compose additively on the same story.
- **Memory tools folded into the chat-handler story, not a separate AI-tools story.** The 4 memory tools are registered and executed by the existing chat.ts handler and only function with the tail-prime model, so they extend STORY-46 rather than CAP-51/52. CAP-51/CAP-52 are duplicate 'Builder AI Developer Tools' capabilities (only STORY-68 populated) — not expanded here.
- **BUG-8 folded into item 4.** It fixes fetch-binding in the same builder-ui chat wiring REQ-25 centralized; a bug fix is an upgrade, so it lands as a robustness AC on the durable-chat-UI story rather than a standalone item.
- **REQ-50 is a no-behavior refactor; reconciliation emits only feature/upgrade, so it is an upgrade to STORY-38.** The @gendev scope and the seeded package skeletons are structural properties of the monorepo STORY-38 already documents.
- **Step 3b — implementation footprint beyond declared scope:** REQ-50's rename mechanically edited 203 files across framework/extractor/tools/tests, but the edits are import-string-only with no behavior change; per the scope-vs-footprint rule these are NOT absorbed into other capabilities' stories. Similarly REQ-24 migrated 10 legacy chat-handler tests to the new request shape — a mechanical consequence of item 3's contract change, not a separate capability.
- **Known out-of-scope issue (not a plan item):** apps/control-app has a pre-existing TS DOM-type build failure (confirmed on baseline 46109cd), and apps/control-app/.dev.vars is untracked but not gitignored — both flagged in the REQ-50 body for separate tickets, neither is reconciled here.
- **No FC test evidence list was supplied** (fc_tests empty). The plan is grounded in the commit diffs themselves; the FC test files present in the commits (test_UAT_FC_REQ-23/24/25/BUG-8_*) are owned by their corresponding items above for downstream AC generation.