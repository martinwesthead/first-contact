---
uid: report-ccf8a8ea
id: REPORT-568
type: report
title: 'Reconciliation Plan: BUNDLE-3 (REQ-9 + REQ-20 + REQ-13 + REQ-21)'
created_by: xgd
created_at: '2026-06-27T00:03:18.704352+00:00'
updated_at: '2026-06-27T00:09:39.747732+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-bbb1bd9c
  anchor_uid: bundle-bbb1bd9c
  items:
  - index: 1
    component: Operator API
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'Operator API foundation: /api/operator/<action_name> dispatch through
      OPERATOR_ACTIONS registry; plan-tier authorization middleware (header-based
      stub: x-account-id, x-plan-tier; defaults to anonymous/trial); typed action
      entries carrying input schema, plan_tier, category (state_edit | system_action),
      tool_spec, ui_route; system-action server-side execution path emitting action:notify;
      SSE event channel at /api/operator/events multiplexing five event types (chat:append,
      state:diff, state:invalidate, action:notify, validation:error) with 15s heartbeat
      and clean disconnect; defensive 403 on plan-tier mismatch inside handlers; publish_stub
      (paid) and report_validation_rejection (trial) seed actions; tools/parity-audit.ts
      scaffolding that enumerates registry entries whose ui_route is null/unimplemented.'
    justification: No existing capability documents the /api/operator namespace, the
      SSE event registry, the plan-tier authorization middleware, or the OPERATOR_ACTIONS
      registry as a single source of truth. This is a new architectural surface that
      all subsequent operator-action REQs (publish, rollback, analyze_page, transcribe,
      etc.) consume. Required by every downstream item in this plan (items 2, 5, 7)
      and the convert-flow critical path.
    story_uid: story-a07c8ed3
  - index: 2
    component: Builder UI / chat handler
    item_type: upgrade
    story_points: 1
    dependencies:
    - 1
    description: POST /api/chat derives its tool list from the OPERATOR_ACTIONS registry
      filtered by session plan_tier rather than from a hard-coded TOOL_DEFINITIONS
      constant. The eight state-edit tools (set_module_content, set_module_dial, set_module_variant,
      add_module, remove_module, reorder_modules, set_theme_token, set_site_config)
      move into the registry with plan_tier='trial', category='state_edit', ui_route=null,
      and execution semantics unchanged. System-action tools are excluded from trial
      sessions.
    justification: 'Existing STORY-46 AC-486 describes /api/chat as proxying Anthropic
      with the v1 tool surface. The handler structurally changed — tool list construction
      now goes through the Operator API registry and is plan-tier-filtered, which
      is a user-visible behavioral change (trial sessions never see system-action
      tools). No new capability bucket: this extends the chat endpoint that STORY-46
      already documents.'
    story_uid: null
    target_story_ids:
    - story-ba9f2715
    intent_delta_summary: Modify AC-486 to reflect that the chat tool list is now
      derived from OPERATOR_ACTIONS filtered by session plan_tier (not from a static
      TOOL_DEFINITIONS constant); add an AC asserting that a trial-plan session is
      offered state-edit tools but not system-action tools.
    acceptance_criteria_changes:
      modify:
      - 'AC-486: chat endpoint constructs its tool list from OPERATOR_ACTIONS filtered
        by the session''s plan_tier (instead of from a static TOOL_DEFINITIONS constant);
        proxies Anthropic and returns extracted text + tool_use blocks as before.'
      add:
      - Trial-plan session receives the eight state-edit tools but does not receive
        system-action tools in its Anthropic tool list.
      - Paid-plan session additionally receives system-action tools (e.g. publish_stub)
        in its Anthropic tool list.
      remove: []
  - index: 3
    component: Web Fetch Safety
    item_type: feature
    story_points: 3
    dependencies:
    - 1
    description: 'packages/web-fetch-safety enforcing the platform-wide safety contract
      for every external-URL fetch. validateTarget: SSRF blocklist (RFC1918, loopback,
      link-local, cloud metadata across v4 + v6) + scheme allowlist (https always,
      http only with explicit same-origin allowance), SSRF check wins over scheme
      on host-bearing schemes. safeFetch: manual redirect handling re-validating each
      hop, 5-redirect cap, 5MB body cap with mid-stream abort, KV-backed 1h response
      cache keyed by sha256(method|url|range). RobotsTxtCache: 24h KV-cached robots
      rules with longest-match precedence and per-chat override list scoped to that
      chat (no global ignore). checkRateLimit: hour (20) / day (100) / burst (10-per-60s)
      windows over FETCH_RATE_KV keyed by account_id, returning 429 + retry_after_seconds.
      chargeBrowserBudget: 50s per chat session / 200s per account-day in BROWSER_BUDGET_KV,
      returning typed budget_exhausted. mintIntentToken / verifyIntentToken: 60s one-shot
      tokens in FETCH_RATE_KV; chat dispatcher mints one when the operator''s latest
      message contains a URL or fetch keyword. /api/_safety/health diagnostic endpoint.
      wrangler.toml binds FETCH_RATE_KV, FETCH_CACHE_KV, FETCH_ROBOTS_KV, BROWSER_BUDGET_KV.'
    justification: No existing capability covers external-URL fetch safety, robots.txt
      handling, per-account rate limits, browser-rendering compute budget, or operator-intent
      tokens. Required as foundation by every external-fetch consumer (analyze_page
      in item 7; REQ-22 Browser Rendering; REQ-28 transcription; REQ-29 search-references)
      — the safety contract is non-negotiable per DOC-9 §11 and must exist before
      any consumer can ship.
    story_uid: null
  - index: 4
    component: Assets Storage
    item_type: feature
    story_points: 1
    dependencies: []
    description: 'ASSETS_BUCKET R2 binding on apps/control-app (root + [env.production])
      plus four CRUD HTTP routes: GET /api/assets/list returning JSON [{key, size,
      etag, uploaded, contentType}]; GET /assets/<key> returning raw object body with
      original Content-Type; PUT /api/assets/put/<key> with optional If-Match: <etag>
      concurrency check (412 on mismatch); DELETE /api/assets/delete/<key>. Wrangler
      dev emulates R2 locally so the full round-trip runs against wrangler dev with
      no real bucket.'
    justification: No existing capability covers customer asset storage as a first-class
      HTTP surface. Required by REQ-21's screenshot persistence path (item 7), REQ-22's
      Browser Rendering screenshots, REQ-16's assets-tab editor, and the convert-flow
      demo's asset transcription. Single bucket for v1 — per-customer-site isolation
      deferred until auth lands.
    story_uid: null
  - index: 5
    component: Builder UI / chat panel
    item_type: upgrade
    story_points: 3
    dependencies:
    - 1
    description: 'Multi-turn AI chat loop with structured tool_results, per-turn site-state
      recomputation, get_site_definition read tool, assistant markdown rendering with
      sanitization, TipTap markdown input editor, ChatCard UI primitive, and tool_result
      kind→renderer dispatcher. After each Anthropic response carrying tool_use blocks,
      the server executes each tool and appends a structured tool_result content block
      ({ok:true, applied:{tool,args,summary}} or {ok:false, error:{tool,validation},
      is_error:true}) before re-calling Anthropic; capped at 8 iterations. The system
      prompt''s site-state snapshot is recomputed each iteration from the canonical
      working site definition. get_site_definition is a system action (plan_tier=''trial'',
      ui_route=null) whose handler returns the current draft via ActionContext.siteDefinition;
      AI receives the JSON in applied.data for mid-conversation state verification.
      Assistant messages render through marked@14 (GFM enabled, links opened in new
      tab with noopener/noreferrer) + DOMPurify; <script> and on*= handlers stripped;
      user/system messages stay plaintext. Chat input replaces the <textarea> with
      a TipTap editor (StarterKit + tiptap-markdown): pasted markdown renders as formatted
      text, Cmd/Ctrl+Enter sends, serialization back to markdown for /api/chat. ChatCard
      vanilla factory createChatCard(parent, {title, icon, tone, body, actions, collapsed,
      onToggleCollapse}) with five tones (neutral, info, success, warning, danger),
      bordered card, left-edge tone accent, optional collapse caret. tool-result-renderers.ts:
      kind→renderer registry; known kinds route to registered components, unknown
      kinds and the no-kind case fall back to a markdown-rendered ChatCard, failed
      results render danger-toned ChatCard.'
    justification: 'Existing STORY-46 documents the chat panel, /api/chat endpoint,
      and AI tool-validation contract. This upgrade extends every one of those surfaces:
      chat loop becomes multi-turn with tool_results (modifies AC-486), assistant
      rendering becomes markdown (extends chat panel), input becomes a TipTap editor
      (extends chat input), state visibility gets a new read tool, and structured
      tool_result rendering gets a reusable primitive (ChatCard) and dispatcher. All
      extensions live inside the chat panel and its endpoint — no new capability bucket;
      the per-kind renderers (DigestReport in item 7, downstream ConvertConfirmation
      / TranscribeProgress) consume the dispatcher but are owned by their respective
      REQs.'
    story_uid: null
    target_story_ids:
    - story-ba9f2715
    intent_delta_summary: 'Modify AC-486 to capture the multi-turn loop with structured
      tool_result blocks and per-iteration state recomputation. Add ACs covering:
      get_site_definition read tool returning current draft; assistant messages rendered
      as markdown via marked + DOMPurify with sanitization of script/event-handler
      injection; chat input via TipTap with markdown round-trip; ChatCard primitive
      (header / body / actions / tone / collapse); tool_result kind→renderer dispatcher
      with markdown fallback and danger card on failure.'
    acceptance_criteria_changes:
      modify:
      - 'AC-486: /api/chat executes a multi-turn loop (max 8 iterations) — after each
        Anthropic response with tool_use blocks the worker executes each tool, appends
        a structured tool_result block ({ok:true, applied:{tool,args,summary}} | {ok:false,
        error:{tool,validation}, is_error:true}), recomputes the system-prompt site-state
        snapshot from the canonical draft, and re-calls Anthropic until no tool calls
        remain or the cap is hit.'
      add:
      - get_site_definition system action (plan_tier='trial', ui_route=null) returns
        the current draft site definition via applied.data; available on every plan
        tier.
      - 'Assistant chat messages render through marked + DOMPurify: headers, lists,
        fenced code render as DOM elements; links open in new tab with noopener/noreferrer;
        inline <script> tags and on*= handlers are stripped; user/system messages
        remain plaintext.'
      - 'Chat input is a TipTap editor (StarterKit + tiptap-markdown): pasting markdown
        renders formatted text in the editor; submission (Cmd/Ctrl+Enter) serializes
        back to markdown for /api/chat.'
      - ChatCard primitive (createChatCard) renders a bordered card with header (icon
        + title), body slot, optional actions row with click callbacks, optional collapse
        caret toggling body visibility, and one of five tones (neutral / info / success
        / warning / danger) applying an edge accent.
      - 'tool_result kind→renderer dispatcher: known kinds route to registered components,
        unknown kinds (and the no-kind case) fall back to a markdown-rendered ChatCard,
        failed tool_results render as a danger-toned ChatCard.'
      remove: []
  - index: 6
    component: Reference Digest extractors
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'packages/extractor: canonical Reference Digest schema and deterministic
      Layer A signal extractors that both the operator and the AI consume. Zod schema
      for ReferenceDigest (schemaVersion: 1, sourceUrl, fetchedAt, fetchPath: ''static''|''rendered'',
      summary, signals{palette, typography, layout, imagery, content, assetInventory[]},
      commentary{perSection, whatsMissing}, screenshotKeys{mobile?, tablet?, desktop?})
      and AssetRecord ({url, kind:''img''|''background''|''video'', alt?, classification:''hero''|''product''|''headshot''|''testimonial''|''decorative''|''unknown'',
      width?, height?, references}); every signal field is string|''not_detected''
      (or array equivalent) so absence is serialized as content. Extractors: parsePalette
      (role inference background/body/accent/cta from <style> blocks + inline style;
      supporting list capped at 6); parseTypography (declared font-family/size/weight
      on body/h1/h2/h3, primary_pair when both declared); parseLayout (max content
      width px, centered/left bias, above-the-fold density score sparse|balanced|dense);
      parseImagery (full asset inventory across <img src> + srcset, inline background-image,
      <style> block CSS rules with background-image, <video src> + <source src>; URLs
      resolved absolute; dedupe by URL with references count; first kind wins on dedup
      with img beating background); parseContent (heading tree, nav links, form fields,
      list/section counts). renderDigestMarkdown produces the KMS-aware shape (one
      H1 title, blockquote summary, table of contents, numbered sections per signal
      category, asset inventory rendered one sub-list per kind with counts, ''What''s
      missing'' section). shouldEscalateToRendered always returns false (REQ-22 hook).
      HTML parsing via linkedom so the package runs in both jsdom (tests) and Workers.'
    justification: No existing capability documents external-website signal extraction,
      the Reference Digest schema, or the deterministic Layer A parsers. This is foundation
      for the convert-flow demo (paste URL → reproduce site) and the digest schema
      is consumed by REQ-22 (multi-modal commentary), REQ-28 (transcription input
      contract), and REQ-29 (multi-page crawl). The schema must exist before the analyze_page
      action (item 7) or any downstream consumer can ship.
    story_uid: null
  - index: 7
    component: analyze_page + DigestReport
    item_type: feature
    story_points: 3
    dependencies:
    - 1
    - 3
    - 5
    - 6
    description: 'analyze_page operator action plus the DigestReport chat-card UI
      that consumes the structured tool_result. The action''s pipeline: input validation
      → operator-intent check (operatorLastMessage implies intent OR fresh intent
      token via verifyIntentToken) → KV digest cache check (key=sha256(url|schemaVersion),
      24h TTL) → robots check via RobotsTxtCache → rate limit (REQ-20 windows) → safeFetch
      → five Layer-A extractors → Anthropic Claude Haiku 4.5 commentary pass producing
      summary + perSection + whatsMissing (deterministic fallback when CLAUDE_API_KEY
      is absent or upstream errors) → KV store → returns { kind: ''reference_digest'',
      digest, digestMarkdown, cache }. ActionContext extended with operatorLastMessage
      (chat handler populates from request.history; router passes null on direct POST).
      Generalizes the surface-payload rule: any system_action whose result carries
      payload.kind=<string> now surfaces applied.data + applied.kind on body.toolCalls
      so the FE dispatcher can route by kind (legacy no-kind path for get_site_definition
      preserved). DigestReport renderer registered with the REQ-13 dispatcher under
      kind=''reference_digest'': createChatCard tone=''info'', header = source URL,
      body = digest markdown via the shared marked+DOMPurify pipeline, structured
      asset-inventory sub-section with per-kind counts and a thumbnail strip per kind,
      actions row with ''Convert this site'' (emits fc:digest-convert-requested CustomEvent
      carrying the digest) and ''Discard'' (collapses the card). Every REQ-20 safety
      failure propagates as a typed error on the {ok:false} branch — no safety failure
      leaks as an uncaught exception. KV digest cache returns cached digest without
      re-fetching or re-running extractors on a second identical call within 24h.'
    justification: No existing capability documents external-site analysis as an operator
      action or the DigestReport chat-card UI. This is the first concrete consumer
      of items 1 (Operator API), 3 (Web Fetch Safety), 5 (ChatCard + dispatcher) and
      6 (extractors) — it ties them together into the convert-flow demo's entry point.
      Distinct from item 6 because the action's plumbing (cache, safety, robots, intent,
      AI commentary pass, registry wiring, FE rendering) is substantial in its own
      right and would obscure the extractor story if merged.
    story_uid: null
---

# Reconciliation Plan: BUNDLE-3 (REQ-9 + REQ-20 + REQ-13 + REQ-21)

**Mode**: commits
**Anchor**: bundle-bbb1bd9c (first-class intent — bundle ticket type)
**Commits analysed** (4):
- `2a774df` feat(operator-api): REQ-9 /api/operator namespace + SSE + plan-tier + tool-execution framework
- `212b974` feat(safety,assets): REQ-20 web fetch safety contract + R2 assets bucket
- `8628a0a` feat(chat): REQ-13 AI state visibility + chat markdown + ChatCard primitive
- `e4ac880` feat(extractor): REQ-21 Reference Digest schema + static-fetch path + Layer A extractors

## Behavior Inventory

```yaml
behavior_inventory:
  source: "free-coded commits: 2a774df, 212b974, 8628a0a, e4ac880"
  features:
    - name: "Operator API namespace + registry + SSE channel (REQ-9)"
      description: "/api/operator/<name> dispatch through OPERATOR_ACTIONS registry; unknown→404; plan-tier middleware (x-account-id, x-plan-tier headers; defaults anonymous/trial); SSE multiplexes five event types; system-action execution path; defensive 403 inside handlers; parity-audit scaffolding."
      behaviors:
        - "POST /api/operator/<unknown_name> returns 404"
        - "POST /api/operator/<paid_action> with trial plan returns 403"
        - "GET /api/operator/events streams SSE with chat:append, state:diff, state:invalidate, action:notify, validation:error event types and 15s heartbeat"
        - "System action handler emits action:notify; SSE channel delivers within 100ms"
        - "validation:error event format {path, expected, got}"
        - "tools/parity-audit.ts enumerates registry entries with null/unimplemented ui_route"
      entry_point: "apps/control-app/src/operator/{router,registry,events,types}.ts; apps/control-app/src/index.ts"
    - name: "Chat tool list derived from registry filtered by plan tier (REQ-9 chat upgrade)"
      description: "/api/chat constructs its tool list from OPERATOR_ACTIONS filtered by session plan_tier; eight state-edit tools migrated from TOOL_DEFINITIONS constant into registry with category='state_edit', plan_tier='trial', ui_route=null."
      behaviors:
        - "Trial session sees state-edit tools but not system-action tools in Anthropic tool list"
        - "Paid session additionally sees system-action tools (e.g. publish_stub)"
      entry_point: "apps/control-app/src/chat.ts"
    - name: "Web fetch safety contract (REQ-20 part 1)"
      description: "packages/web-fetch-safety enforcing SSRF + scheme + redirect + size + cache + robots + rate-limit + browser-budget + operator-intent-token. /api/_safety/health diagnostic."
      behaviors:
        - "validateTarget rejects RFC1918 / loopback / link-local / cloud-metadata / broadcast / unspecified across v4 and v6 with typed reason"
        - "validateTarget rejects non-https/http schemes (file, gopher, data, ftp) with disallowed_scheme"
        - "safeFetch follows redirects re-validating each hop; rejects on hop crossing into SSRF blocklist"
        - "safeFetch aborts at 5MB body cap and returns body_too_large with no partial body"
        - "safeFetch returns too_many_redirects on the 6th redirect"
        - "KV response cache returns HIT on second identical fetch within 1h"
        - "Rate limit: 21st call in rolling hour returns 429 with retry_after_seconds"
        - "Burst limit: 11th call in 60s returns 429 regardless of hourly budget"
        - "Browser budget: 51st-second request returns budget_exhausted"
        - "RobotsTxtCache honours per-chat overrides; sibling chats unaffected"
        - "AI tool refused without operator-intent token (missing_intent)"
        - "Operator-intent token expires after 60s"
      entry_point: "packages/web-fetch-safety/src/*; apps/control-app/src/safety/{account,health}.ts"
    - name: "R2 assets bucket CRUD routes (REQ-20 part 2)"
      description: "ASSETS_BUCKET R2 binding plus four CRUD HTTP routes wired into apps/control-app."
      behaviors:
        - "PUT /api/assets/put/<key> writes the object; subsequent GET /assets/<key> returns the same bytes and Content-Type"
        - "GET /api/assets/list enumerates objects with {key, size, etag, uploaded, contentType}"
        - "PUT with stale If-Match returns 412 precondition_failed; matching If-Match bumps the etag"
        - "DELETE /api/assets/delete/<key> removes the object; subsequent GET returns 404"
        - "All routes pass under wrangler dev with the local R2 emulator"
      entry_point: "apps/control-app/src/assets/routes.ts; wrangler.toml [[r2_buckets]]"
    - name: "Multi-turn chat loop + state visibility + markdown + ChatCard (REQ-13)"
      description: "chat.ts multi-turn Anthropic loop with structured tool_result blocks and per-iteration recomputed system-prompt site state. get_site_definition read tool. Assistant markdown rendering via marked + DOMPurify with sanitization. TipTap markdown input editor. ChatCard primitive + tool_result kind→renderer dispatcher."
      behaviors:
        - "After each Anthropic response with tool_use blocks, worker executes each tool and appends structured tool_result block, re-calls Anthropic; capped at 8 iterations"
        - "Per-iteration site-state snapshot recomputed from canonical working site definition"
        - "get_site_definition system action returns current draft via applied.data; available on every tier"
        - "Assistant chat messages render markdown headers/lists/code as DOM elements; <script> and on*= stripped; links open in new tab with noopener/noreferrer; user/system messages stay plaintext"
        - "Chat input via TipTap (StarterKit + tiptap-markdown): pasted markdown renders formatted; Cmd/Ctrl+Enter sends; submission serializes markdown to /api/chat"
        - "ChatCard primitive renders header (icon + title), body, actions row with click callbacks, optional collapse caret, one of five tones with edge accent"
        - "tool_result kind→renderer dispatcher: known kind routes to component; unknown / no-kind falls back to markdown ChatCard; failure renders danger ChatCard"
      entry_point: "apps/control-app/src/chat.ts; apps/control-app/src/operator/registry.ts (get_site_definition); packages/builder-ui/src/components/{chat-card,chat-panel,tool-result-renderers}.ts; packages/builder-ui/src/chat-driver.ts"
    - name: "Reference Digest schema + Layer A extractors (REQ-21 part 1)"
      description: "packages/extractor: Zod schema for ReferenceDigest + AssetRecord; deterministic extractors (parsePalette, parseTypography, parseLayout, parseImagery, parseContent); KMS-aware markdown renderer; static-only escalation hook."
      behaviors:
        - "Every signal field serializes as string | 'not_detected' (or array equivalent); sparse-signal pages render absence as content"
        - "parsePalette infers background/body/accent/cta roles with up to 6 supporting colors"
        - "parseTypography extracts declared font-family/size/weight on body and h1/h2/h3; primary_pair when both declared"
        - "parseLayout produces max-width px, centered/left bias, density score sparse|balanced|dense"
        - "parseImagery emits AssetRecord across <img src> + srcset, inline background-image, <style> background-image, <video src> + <source src>; URLs resolved absolute; dedup by URL with references count; first kind wins (img beats background)"
        - "parseContent produces heading tree, nav links, form fields, list/section counts"
        - "renderDigestMarkdown produces KMS shape (single H1, blockquote summary, ToC, numbered sections, per-kind asset inventory, 'What's missing')"
        - "shouldEscalateToRendered always returns false in this REQ (REQ-22 hook)"
      entry_point: "packages/extractor/src/{schema,parse-palette,parse-typography,parse-layout,parse-imagery,parse-content,render-markdown,escalate,extract,dom,css-walk}.ts"
    - name: "analyze_page operator action + DigestReport chat-card (REQ-21 part 2)"
      description: "analyze_page system action wiring safety + cache + robots + rate-limit + safeFetch + extractors + Haiku 4.5 commentary pass. DigestReport renderer registered with REQ-13 dispatcher under kind='reference_digest'. Generalizes surface-payload-data rule for any payload.kind=string."
      behaviors:
        - "analyze_page(url) returns valid ReferenceDigest with schemaVersion:1, all five signal categories populated, digestMarkdown matching KMS shape"
        - "KV digest cache (sha256(url|schemaVersion), 24h TTL) returns cached digest without re-fetching or re-running extractors"
        - "Robots disallow returns requires_robots_override; per-chat override allows next call"
        - "Operator-intent token required (operatorLastMessage implies, or verifyIntentToken)"
        - "All REQ-20 safety failures propagate as typed errors on {ok:false} branch — no uncaught exceptions"
        - "AI commentary pass uses Claude Haiku 4.5 with deterministic fallback when CLAUDE_API_KEY absent or upstream errors"
        - "Chat record after analyze_page contains structured tool_result of kind='reference_digest' carrying the full digest object"
        - "DigestReport chat-card renders via REQ-13 dispatcher: source URL header, digest markdown body, structured asset-inventory sub-section with per-kind counts and thumbnails, 'Convert this site' / 'Discard' actions"
        - "'Convert this site' click dispatches fc:digest-convert-requested CustomEvent with digest payload (REQ-28 listens)"
      entry_point: "apps/control-app/src/operator/analyze-page.ts + registry.ts; apps/control-app/src/chat.ts (operatorLastMessage threading + body.toolCalls surfacing); packages/builder-ui/src/components/digest-report.ts; packages/builder-ui/src/main.ts (registerDigestReport)"
```

## Coverage Map

```yaml
coverage_map:
  - feature: "Operator API namespace + registry + SSE channel (REQ-9)"
    status: uncovered
    existing_stories: []
    existing_acs: []
    gaps:
      - "No story documents /api/operator/* namespace, OPERATOR_ACTIONS registry, plan-tier middleware, SSE event channel with five event types, or parity-audit scaffolding"
    notes:
      - "New capability bucket (Operator API). Foundation for items 2, 5, 7 in this plan and for all future operator-action REQs."
  - feature: "Chat tool list derived from registry filtered by plan tier (REQ-9 chat upgrade)"
    status: partial
    existing_stories: ["story-ba9f2715 (STORY-46)"]
    existing_acs: ["AC-486 (POST /api/chat proxies Anthropic and returns extracted text + tool_use blocks)"]
    gaps:
      - "AC-486 currently describes the v1 tool surface as the static set; reality: derived from OPERATOR_ACTIONS, filtered by plan_tier"
      - "No AC asserts trial vs paid plan tool-list differences"
  - feature: "Web fetch safety contract (REQ-20 part 1)"
    status: uncovered
    existing_stories: []
    existing_acs: []
    gaps:
      - "No story documents validateTarget, safeFetch, RobotsTxtCache, rate-limit windows, browser budget, or operator-intent tokens"
  - feature: "R2 assets bucket CRUD routes (REQ-20 part 2)"
    status: uncovered
    existing_stories: []
    existing_acs: []
    gaps:
      - "No story documents ASSETS_BUCKET binding or the four CRUD routes"
  - feature: "Multi-turn chat loop + state visibility + markdown + ChatCard (REQ-13)"
    status: partial
    existing_stories: ["story-ba9f2715 (STORY-46)"]
    existing_acs: ["AC-486 (chat proxies Anthropic — single-shot), and the chat-panel ACs (AC-477..AC-485) describing the SPA shell, splitter, viewport, persistence"]
    gaps:
      - "AC-486 describes single-shot proxy; reality is multi-turn with tool_result blocks and per-iteration state recomputation"
      - "No AC covers structured tool_result content blocks, get_site_definition read tool, assistant markdown rendering, TipTap input, ChatCard primitive, or tool_result dispatcher"
  - feature: "Reference Digest schema + Layer A extractors (REQ-21 part 1)"
    status: uncovered
    existing_stories: []
    existing_acs: []
    gaps:
      - "No story documents the Reference Digest schema, signal extractors, or the digest markdown renderer"
  - feature: "analyze_page operator action + DigestReport chat-card (REQ-21 part 2)"
    status: uncovered
    existing_stories: []
    existing_acs: []
    gaps:
      - "No story documents the analyze_page action, its safety pipeline, the AI commentary pass, KV digest caching, or the DigestReport chat-card UI"
```

## Plan Items

| # | Component | Type | Points | Deps | Description |
|---|-----------|------|--------|------|-------------|
| 1 | Operator API | feature | 3 | — | /api/operator namespace + OPERATOR_ACTIONS registry + plan-tier middleware + SSE multiplexed channel + system-action execution + parity-audit |
| 2 | Builder UI / chat handler | upgrade STORY-46 | 1 | 1 | /api/chat derives tool list from OPERATOR_ACTIONS filtered by plan_tier; state-edit tools migrate into registry |
| 3 | Web Fetch Safety | feature | 3 | 1 | packages/web-fetch-safety: SSRF + scheme + redirects + size + cache + robots + rate limits + browser budget + intent tokens |
| 4 | Assets Storage | feature | 1 | — | ASSETS_BUCKET R2 binding + four CRUD routes (list / get / put with If-Match / delete) |
| 5 | Builder UI / chat panel | upgrade STORY-46 | 3 | 1 | Multi-turn loop with structured tool_results + per-iteration state recompute + get_site_definition + marked/DOMPurify + TipTap + ChatCard primitive + tool_result dispatcher |
| 6 | Reference Digest extractors | feature | 3 | — | packages/extractor: Zod schema + 5 Layer-A extractors + KMS-aware markdown renderer + escalation hook |
| 7 | analyze_page + DigestReport | feature | 3 | 1,3,5,6 | analyze_page system action (safety + cache + robots + rate limit + safeFetch + extractors + Haiku commentary) + DigestReport chat-card |

**Total**: 7 items, 17 story points (5 feature, 2 upgrade).

## Observations

- **Bundle is a coherent vertical slice for the convert-flow demo.** REQ-9 establishes the Operator API; REQ-20 adds the safety + storage primitives; REQ-13 makes chat capable of carrying structured cards; REQ-21 ships the first concrete consumer (analyze_page → DigestReport). Items 1, 3, 4, 6 are independent foundation work; items 2 and 5 are upgrades to STORY-46 reflecting how the chat surface evolved; item 7 is the integration.
- **Two upgrades target the same story (STORY-46) but capture distinct intents.** Item 2 is REQ-9's chat handler restructuring (tool list now flows through the registry, filtered by plan tier). Item 5 is REQ-13's substantial chat-loop evolution (multi-turn + tool_results + read tool + markdown + TipTap + ChatCard). Keeping them as separate upgrade items preserves the intent provenance and gives the story cycle two distinct AC change sets to apply.
- **ChatCard + tool_result dispatcher folded into item 5 (not split into a separate story).** The primitive lives inside the chat panel and is exercised in chat contexts; downstream renderers (DigestReport in item 7, REQ-28's ConvertConfirmation / TranscribeProgress later) register through the dispatcher but belong to their own REQs. Splitting would create a story with no user-visible behavior of its own.
- **R2 assets bucket (item 4) carved off REQ-20 as a separate feature item.** The bucket binding and CRUD routes are foundation plumbing for REQ-22 / REQ-16 / REQ-21's later screenshot persistence; they have no behavioral overlap with the safety contract (item 3). Separating them keeps each story-sized and lets downstream regression cover them independently.
- **Generalized surface-payload-data rule** introduced in REQ-21 (any system_action with payload.kind=string surfaces applied.data + applied.kind on body.toolCalls; legacy no-kind path preserved for get_site_definition) is included in item 7's description because it's enacted alongside analyze_page. If it should instead be attached to item 5's dispatcher AC, the story cycle can re-home it.
- **No code changes proposed.** The plan documents what the code already does; the story cycle will write UATs against the existing implementation. Per the FRAGILE-INTENT contract, the bundle ticket body + the four commit diffs are the authority.
- **SSE bus is an in-memory module singleton** per REQ-9's free-coded commit note — production graduation to Durable Objects is a follow-up REQ; this plan documents the v1 single-isolate behavior the code actually implements, not the eventual production shape.
- **AC count per upgrade is realistic given the surface area touched.** Item 5 adds ~5 ACs and modifies AC-486; item 2 adds 2 ACs and modifies AC-486. The story cycle implementing item 2 should preserve item 5's modifications to AC-486 if applied in sequence.