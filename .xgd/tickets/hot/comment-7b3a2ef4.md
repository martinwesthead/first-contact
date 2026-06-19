---
uid: comment-7b3a2ef4
id: COMMENT-100
type: comment
title: Comment on request REQ-21
created_by: xgd
created_at: '2026-06-18T23:39:43.741698+00:00'
updated_at: '2026-06-19T00:19:07.016262+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-a85ed771
  kind: chat_transcript
---

<!-- xgd-turn id="43a345e2-92c6-4fe1-a5c2-bf6ece43a082-user" -->

<!-- xgd-chat role="user" ts="2026-06-18T23:39:33.978Z" -->
#### You
Are you ready to free code this ticket?

<!-- xgd-turn id="43a345e2-92c6-4fe1-a5c2-bf6ece43a082-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-18T23:40:27.431Z" -->
#### Claude
Yes — let me first review the current state of the ticket and the codebase to scope what's needed before touching any code.

I have the full ticket scope. REQ-21 needs a new `packages/extractor` package, the `analyze_page` AI tool wired into the existing safety layer ([[REQ-20]]) and chat dispatcher ([[REQ-13]]), and a `<DigestReport>` chat-card variant. Let me look at the existing scaffolding briefly to confirm wire-up points before stating readiness.

Yes — I'm ready to free code REQ-21. The ticket body is unusually detailed (essentially a working spec already) so I don't need clarification on scope. Two observations before starting:

**One flag worth raising first**: there are uncommitted changes from REQ-13 in the working tree — `chat-card.ts`, `tool-result-renderers.ts`, the chat.ts/router.ts/registry.ts mods, and ~13 REQ-13 test files. REQ-21's `<DigestReport>` chat-card variant depends on REQ-13's `<ChatCard>` primitive and the `tool_result_dispatcher`. **Is REQ-13 finished and ready for me to commit it as a free-coded ticket before I start REQ-21, or should I treat the in-tree REQ-13 work as scaffolding I build on top of?** I don't want to silently absorb someone else's WIP into a REQ-21 commit.

**My plan once you confirm the REQ-13 state:**

1. **`packages/extractor` (new package)** — Zod schema for `ReferenceDigest` + `AssetRecord`, plus the 5 deterministic extractors (`parsePalette` / `parseTypography` / `parseLayout` / `parseImagery` / `parseContent`), `renderDigestMarkdown`, and the `shouldEscalateToRendered` stub. HTML parsing via `linkedom` (browser-compatible, works on Workers — per DOC-7 §10.2). Per-kind asset discovery with absolute-URL dedup and `references` count.

2. **`analyze_page` AI tool in `apps/control-app/src/operator/registry.ts`** — registered as a system_action with `plan_tier: 'trial'`. Pipeline: REQ-20 safety → KV cache check → `safeFetch` → 5 extractors → Haiku 4.5 commentary pass → KV cache store (24h) → return structured `tool_result` with `kind: 'reference_digest'`.

3. **`<DigestReport>` in `packages/builder-ui/src/components/`** — registered with REQ-13's `tool_result_dispatcher` under `kind: 'reference_digest'`. Renders via `<ChatCard tone="info">`, body uses the same markdown pipeline as chat messages, asset inventory rendered as a structured sub-section with per-kind counts.

4. **Test fixtures** under `tests/fixtures/convert-flow/plain-html-site/` and `sparse-signal/`.

5. **UATs** named `test_UAT_FC_REQ-21_*` — one per acceptance criterion (13 ACs → likely ~13 UATs, some parameterized). Includes: schema shape, sparse-signal `not_detected` paths, palette role inference, img/background/video inventory, dedup, markdown rendering, KV cache, escalation hook, safety error propagation, end-to-end chat-card render.

6. **Version bump (patch)**, single commit with `[FREE-CODED]`, ticket → `free_coded` with the SHA + story_points=7, body left as-is.

Let me know on REQ-13 and I'll start.

<!-- xgd-turn id="fe2607a9-4997-4740-8e16-0a4991cfc423-user" -->

<!-- xgd-chat role="user" ts="2026-06-18T23:52:54.530Z" -->
#### You
REQ-13 is free coded (which you can see yourself, of course). Please proceed

<!-- xgd-turn id="fe2607a9-4997-4740-8e16-0a4991cfc423-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-19T00:19:05.978Z" -->
#### Claude
Now I'll write the extractor schema and modules.

Now wire `analyze_page` into the registry and extend `ActionContext` with `operatorLastMessage`.

Now extend `ChatHandlerEnv`, populate `operatorLastMessage`, and generalize the `data:` surface rule.

Now update the operator router to pass `operatorLastMessage: null` and add a summarizer entry, then type-check.

I need to make the extractor DOM-type-free at the type boundary so control-app's worker compile doesn't pull in DOM lib. Switching to local minimal DOM interfaces.

REQ-21 is free-coded.

**Summary of what landed in commit `e4ac880`:**

- **`packages/extractor` (new)** — Zod-typed `ReferenceDigest` schema + the five Layer A extractors (`parsePalette`, `parseTypography`, `parseLayout`, `parseImagery`, `parseContent`), `renderDigestMarkdown` (KMS-aware shape per DOC-9 §9), and the `shouldEscalateToRendered` stub. HTML parsing via `linkedom`, with local minimal DOM-shape interfaces so workers-types consumers don't need DOM lib.
- **`analyze_page` system action** (apps/control-app) — full safety pipeline: input check → operator-intent → 24h KV digest cache → robots.txt → rate-limit → `safeFetch` → extractors → Haiku 4.5 commentary (with deterministic fallback) → cache store. Wired into `ChatHandlerEnv` (added `FETCH_CACHE_KV` / `FETCH_ROBOTS_KV`) and `ActionContext` (added `operatorLastMessage`).
- **chat.ts generalization** — system-action results with a kind-tagged payload now surface in `body.toolCalls` AND `applied.data`, so the FE chat-driver routes them through the REQ-13 dispatcher. The legacy `get_site_definition` path (no kind → `systemActions` only) is preserved.
- **`<DigestReport>` in builder-ui** — `info`-toned ChatCard with markdown body + structured asset-inventory sub-section (per-kind counts + thumbnail strip). "Convert this site" emits a `fc:digest-convert-requested` CustomEvent for REQ-28; "Discard" collapses. Registered with the dispatcher from `bootBuilder`.
- **13 UATs** (`tests/test_UAT_FC_REQ-21_*`) — one per acceptance criterion, including the end-to-end chat → `analyze_page` → `<DigestReport>` test that exercises the full critical path with mocked `safeFetch` + Anthropic. Test fixtures under `tests/fixtures/convert-flow/{plain-html-site,sparse-signal}/`.

**Quality:** `xgd quality run --all-tests` → ✅ SUCCESS (210 tests, matches quality.yaml expectations). One pre-existing REQ-6 race-condition flake when run in parallel; unrelated to this REQ and passes in isolation.

**Ticket:** REQ-21 → status=`free_coded`, commits=[`e4ac880`].

<!-- xgd-chat-end -->