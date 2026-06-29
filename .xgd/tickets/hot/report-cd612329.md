---
uid: report-cd612329
id: REPORT-778
type: report
title: 'Reconciliation Plan: BUNDLE-6 (BUG-11 + REQ-10 + REQ-37 + REQ-36 + REQ-38
  + REQ-41)'
created_by: xgd
created_at: '2026-06-29T21:26:07.128346+00:00'
updated_at: '2026-06-29T21:37:04.736823+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-4e8020d6
  anchor_uid: bundle-4e8020d6
  items:
  - index: 1
    component: Site Data Model & Persistence (D1)
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'Documents the new D1 persistence model shipped by REQ-10 (commit
      8ea7a82): forward migrations 0002-0004 creating accounts (id, email UNIQUE,
      plan_tier trial|paid), sites (account_id FK, globally-UNIQUE slug, draft_definition
      + published_definition JSON, publish pointers, indexes on account_id and slug),
      and revisions (site_id FK, JSON snapshot, publish metadata, indexes); reversible
      down migrations in db/migrations-down/; a seed migration 0005 bootstrapping
      the platform-owned account and the 1stcontact site from sites/1stcontact/site.json;
      plus packages/site-schema additions reserved-slugs.ts, slug.ts (isValidSlug
      / isReservedSlug / suggestAlternativeSlug: 3-40 chars, lowercase+digits+single
      internal hyphens), and db-types.ts (row + parsed-JSON variants).'
    justification: 'No existing story or capability covers a persistence / multi-site
      data model. STORY-39 (CAP-32 Site Definition Schema) documents only the in-memory
      Zod Site contract and validateSite; it does not cover D1 migrations, the accounts/sites/revisions
      tables, slug allocation in the *.1stcontact.io namespace, or the seed. This
      is a genuinely new capability bucket (data model + slug allocation + bootstrap
      seed), so it cannot be folded into an existing story as an upgrade. Code is
      ground truth: 8 UAT files / 53 tests already exercise apply-clean, reversibility,
      slug validation (valid/invalid/reserved/suggestions), the UNIQUE slug constraint,
      and the seeded definition validating against validateSite.'
    story_uid: story-a3283461
  - index: 2
    component: External Fetch Safety (web-fetch-safety package)
    item_type: upgrade
    story_points: 1
    dependencies: []
    description: 'Documents BUG-11 (commit a59e985): the four web-fetch-safety sources
      that touch KV (browser-budget.ts, intent-token.ts, rate-limit.ts, types.ts)
      now `import type { KVNamespace } from ''@cloudflare/workers-types''` instead
      of relying on it as a bare ambient global. This makes the package self-contained:
      downstream consumers (e.g. packages/extractor, whose tsconfig deliberately omits
      workers-types from its types[] array) compile cleanly instead of hitting nine
      TS2304 ''Cannot find name KVNamespace'' errors during `pnpm build`. Type-only
      import, zero runtime impact.'
    justification: STORY-53 already documents the External Fetch Safety contract (CAP-44
      / capability-f446e94d) and the web-fetch-safety package is its implementation,
      so this is a build/consumption invariant of that same capability bucket — not
      a new capability. No parallel implementation is introduced; the package's public
      surface is unchanged at runtime. Captured as an upgrade adding a single consumer-build-hygiene
      AC; the FC test test_UAT_FC_BUG-11_web_fetch_safety_consumer_builds asserts
      both the type-import presence and that extractor builds.
    story_uid: story-a0482aed
    target_story_ids:
    - story-a0482aed
    acceptance_criteria_changes:
      add:
      - web-fetch-safety source modules import KVNamespace as a type so downstream
        packages compile without declaring @cloudflare/workers-types (extractor builds
        cleanly via pnpm --filter extractor build)
      modify: []
      remove: []
    intent_delta_summary: 'Extend STORY-53 with a packaging/consumption invariant:
      the fetch-safety package leaks no ambient workers-types global onto consumers.
      No change to the runtime fetch-safety contract (SSRF, rate limits, budgets,
      robots, intent tokens).'
  - index: 3
    component: Site Transcription (Convert Flow) — digest robustness
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'Documents the server-side robustness work of REQ-37 (commit e5cec1a)
      in transcribe-site.ts / read-transcription-digest.ts / registry.ts: (1) Stage
      0 of transcribe_site now evicts any prior digest at sites/{siteId}/transcription/digest.json
      before any mechanical work, so a mid-flight convert never serves stale data;
      (2) after the digest write, a read-back verifies the round-tripped capturedAt
      matches what was put, returning a failed result with digest_write_unverified
      on drift; (3) asset-mirror failures are reported per-URL with a reason in payload.summary.assetFailures;
      (4) read_transcription_digest returns a distinct kind=transcription_digest_not_ready
      status (rather than a generic failed/not-found result) when nothing is present,
      so the AI can poll without surfacing a hard tool error.'
    justification: STORY-58 (CAP-47 / capability-e343131c) already owns the deterministic
      transcription digest and its read-back contract (AC-642/AC-643 read-back returns/not-found;
      AC-641 un-mirrored assets recorded in the mirror summary). REQ-37's server changes
      extend that existing read-back/summary surface in place — eviction, write-verification,
      a new not_ready status, and per-URL asset-failure reasons — without introducing
      a new capability bucket or a parallel digest path. Therefore upgrade, not feature.
    story_uid: null
    target_story_ids:
    - story-f45a5e61
    acceptance_criteria_changes:
      add:
      - transcribe_site Stage 0 evicts any prior digest before mechanical work so
        a re-run never serves a stale digest
      - Digest write is verified by read-back (capturedAt round-trip); a mismatch
        returns a digest_write_unverified failure rather than silently succeeding
      - read_transcription_digest returns a distinct transcription_digest_not_ready
        status (not a hard error) when no digest is present yet
      modify:
      - 'AC-641: asset-mirror failures are surfaced per-URL with a reason in summary.assetFailures
        (not only excluded from the inventory)'
      remove: []
    intent_delta_summary: 'Extend STORY-58''s digest read-back contract to fail loudly
      at each stage instead of silently continuing: stage-0 eviction, write read-back
      verification, a pollable not_ready status, and per-URL asset-failure reasons
      in the mirror summary.'
  - index: 4
    component: Builder UI — chat panel rebuild + streaming
    item_type: upgrade
    story_points: 3
    dependencies: []
    description: 'Documents REQ-36 (commit be19e5f): the builder chat panel is reworked
      to XGD-widget parity and responses stream end-to-end instead of arriving as
      a single block. G1-G2/G4 — 13px typography and a single rounded-pill input capsule
      with markdown typography and a placeholder hint. G3/G7 — a round accent Send
      button (play glyph) positioned inside the input that swaps for a red round Stop
      button while a turn is in flight; the spinner overlay is removed. G5 — user
      messages render through marked + DOMPurify (previously plaintext). G6 — a new
      collapsible tool-use pane above the message list (appendToolEvent / clearToolEvents
      / expandToolPane), with inline ChatCard result renderers kept alongside. G8
      — bare Enter sends; Shift/Alt/Meta/Ctrl+Enter inserts a newline. G9 — apps/control-app/src/chat.ts
      returns text/event-stream emitting token / tool_call / tool_result / done /
      error events by consuming Anthropic''s upstream stream; chat-driver.ts reads
      the SSE and grows an in-flight assistant bubble token-by-token; Stop wires its
      abort to the per-turn AbortController.'
    justification: STORY-46 (CAP-38 Builder UI / capability-6694c60f) already documents
      the chat-driven builder SPA including the chat input editor (AC-582/AC-671),
      assistant/user markdown (AC-581), the in-flight busy affordance (AC-673/AC-675/AC-676),
      and the /api/chat Anthropic proxy returning text + tool_use (AC-486). REQ-36
      modifies these existing behaviors in place (streaming replaces single-block;
      Send/Stop replaces the spinner; user markdown; Enter-to-send) and adds the tool-use
      pane. This is an in-place evolution of the same capability bucket with no parallel
      chat surface, so upgrade.
    story_uid: null
    target_story_ids:
    - story-ba9f2715
    acceptance_criteria_changes:
      add:
      - 'Assistant responses stream progressively: an empty assistant bubble is appended
        at turn start and grows on each SSE token event; an error event surfaces a
        sorry-message bubble'
      - A collapsible tool-use pane above the message list shows live tool events
        (chevron toggle), with inline ChatCard result renderers retained alongside
      - Bare Enter sends the message; Shift/Alt/Meta/Ctrl+Enter inserts a newline
      - Chat input is a rounded-pill capsule at 13px typography with markdown typography
        and an Enter-to-send placeholder hint (XGD parity)
      modify:
      - 'AC-486: POST /api/chat returns a text/event-stream (token/tool_call/tool_result/done/error)
        consuming Anthropic''s upstream stream, replacing the single-block JSON response'
      - 'AC-581: user messages render as sanitized markdown (previously plaintext);
        system messages stay plaintext'
      - 'AC-673/AC-676: in-flight affordance is a round Send->Stop swap wired to a
        per-turn AbortController, replacing the CSS spinner'
      remove: []
    intent_delta_summary: Evolve STORY-46's chat panel to XGD-widget parity with end-to-end
      SSE streaming, a Send/Stop swap, user-message markdown, a collapsible tool-use
      pane, and bare-Enter-to-send; no new chat surface, existing busy/markdown/proxy
      ACs are updated in place.
  - index: 5
    component: Builder UI — chat-loop tool-call failure integrity & surfacing
    item_type: upgrade
    story_points: 2
    dependencies:
    - 4
    description: 'Documents REQ-38 (commit 3a47635) and the client-side half of REQ-37
      (commit e5cec1a). REQ-38: in apps/control-app/src/chat.ts the state_edit applyToolCall
      call site is wrapped in try/catch so a single thrower yields one structured
      ok:false ChatToolResult (with is_error on the wire) while the other calls in
      the same batch keep producing their own results — previously a throw escaped
      the per-call loop, was caught at stream level, and collapsed the whole turn
      to one error event. applyToolCall is injected via ChatHandlerDeps for deterministic
      testing, and the throw is logged via the apply_tool_call_threw hook. REQ-37
      client: BuilderState.pendingToolFailures collects every rejected tool call;
      chat-driver renders a dismissable failure banner above the message list and,
      on the next outbound turn, prepends a synthetic system message describing the
      failures so the AI can self-correct before the buffer is cleared.'
    justification: Both behaviors extend STORY-46's existing tool-call result contract
      (AC-483 accepted call advances state; AC-484 rejected call records a structured
      error). They harden batch tool-call handling and surface failures in the same
      builder chat surface — no new capability bucket, no parallel chat or dispatch
      path. REQ-38 explicitly attaches to the REQ-36 SSE structure, hence the dependency
      on item 4. Captured as upgrade with added ACs covering per-call survival and
      the failure panel/re-injection.
    story_uid: null
    target_story_ids:
    - story-ba9f2715
    acceptance_criteria_changes:
      add:
      - A tool call that throws inside a batch yields one structured ok:false result
        (is_error on the wire) without dropping the sibling calls' results; the throw
        is logged via apply_tool_call_threw
      - Rejected tool calls are collected into pendingToolFailures, surfaced in a
        dismissable failure banner, and prepended as a synthetic system message on
        the next AI turn (then cleared) so the AI can self-correct
      modify: []
      remove: []
    intent_delta_summary: Extend STORY-46 so per-tool-call failures in a batch survive
      and are surfaced/re-injected, rather than one throw collapsing the whole turn
      and silently losing sibling results.
  - index: 6
    component: Framework Module Catalog — image-gallery@v1
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'Documents REQ-41''s module (commit 6f3fa5a): a new image-gallery@v1
      content module registered in the framework catalog. Variants grid (1:1 locked
      tiles) and masonry (pure-CSS column-count layout, no JS hydration). Dials columns
      (2/3/4), gap (tight/normal/loose), spacingTop/spacingBottom (the geometric scale),
      surface (default/subtle/inverse/accent). Content: optional heading and items[]
      (2..24) each with a required image AssetRef and optional caption. Responsive:
      the columns dial collapses (2->1, 3->2, 4->2) below the md breakpoint. Images
      render with loading=lazy and decoding=async; no client JS, no lightbox.'
    justification: STORY-42 (CAP-34 Framework Module Catalog / capability-3630a42c)
      already documents the content-module catalog (text-block, services-grid, contact-form)
      and the registry that resolves them (AC-441/AC-442). image-gallery extends that
      same catalog bucket as one more content module conforming to the existing module
      contract (variants/dials/content + validation bounds), not a new capability
      surface — so upgrade, extending the catalog membership/registry-resolution ACs
      rather than introducing a parallel module system.
    story_uid: null
    target_story_ids:
    - story-f1e061ba
    acceptance_criteria_changes:
      add:
      - image-gallery grid variant emits one tile per item and tags data-variant=grid
      - image-gallery masonry variant uses a pure-CSS column-count layout
      - image-gallery optional heading renders only when present; per-item caption
        renders only when provided
      - image-gallery columns dial maps to the corresponding modifier class and collapses
        responsively below md
      - image-gallery rejects items[] length outside 2..24
      modify:
      - 'AC-442: framework module registry resolves image-gallery@v1 alongside the
        existing Phase 0 modules'
      remove: []
    intent_delta_summary: Extend STORY-42's content-module catalog with the image-gallery@v1
      module (grid + masonry) and its registry registration; existing modules and
      the module contract are unchanged.
  - index: 7
    component: Site Transcription (Convert Flow) — reproduce-a-website how-to
    item_type: upgrade
    story_points: 1
    dependencies:
    - 6
    description: 'Documents the REQ-41 doc follow-up (commit 0dcaa39): the AI''s reproduce-a-website
      how-to (docs/llm-context/reproducing-a-website.md and its byte-for-byte mirror
      apps/control-app/src/llm-context.ts) now names image-gallery as the catalog
      target for sequential image content during visual-proximity matching, and explains
      that items[] is populated one entry per asset, each { image: <AssetRef>, caption?:
      <string> }.'
    justification: STORY-58 (CAP-47 / capability-e343131c) owns the reproduce-a-website
      how-to content the convert AI receives (AC-704 'Reproduction how-to instructs
      the precomputed AssetRef object for image fields'). Naming image-gallery for
      sequential images and how to fill items[] is an extension of that same how-to
      guidance — not a new capability — so it is an upgrade adding one how-to AC,
      not a feature. The FC test test_UAT_FC_REQ-41_llm_context_doc_mentions_image_gallery
      guards the mention against silent drift, so it must be covered by a plan item.
    story_uid: null
    target_story_ids:
    - story-f45a5e61
    acceptance_criteria_changes:
      add:
      - The reproduce-a-website how-to (doc + inlined system-prompt mirror) names
        image-gallery for sequential image content and documents one items[] entry
        per asset with image AssetRef and optional caption
      modify: []
      remove: []
    intent_delta_summary: Extend STORY-58's how-to ACs so the convert AI is told to
      choose image-gallery for sequential images and how to populate its items[];
      depends on item 6 (the module must exist for the guidance to be valid).
---

# Reconciliation Plan — BUNDLE-6

**Mode**: commits
**Anchor**: bundle-4e8020d6 (BUNDLE-6, type=bundle — anchor IS the intent aggregate)
**Source tickets**: BUG-11, REQ-10, REQ-37, REQ-36, REQ-38, REQ-41

Reconciliation updates the capability matrix to faithfully describe what the 11 bundled commits actually do. No code changes — plan only.

## Commit → ticket → plan-item map

| Commit | Ticket | Plan item |
|--------|--------|-----------|
| a59e985 | BUG-11 | #2 upgrade STORY-53 |
| 8ea7a82 | REQ-10 | #1 feature (new) |
| e5cec1a | REQ-37 (server) | #3 upgrade STORY-58 |
| e5cec1a | REQ-37 (client) | #5 upgrade STORY-46 |
| be19e5f | REQ-36 | #4 upgrade STORY-46 |
| 3a47635 | REQ-38 | #5 upgrade STORY-46 |
| 6f3fa5a | REQ-41 (module) | #6 upgrade STORY-42 |
| 0dcaa39 | REQ-41 (how-to) | #7 upgrade STORY-58 |
| a1ed699, 9121fdd, 395e2bc, ff2c55d | version bumps | none (no behavior) |

## Behavior Inventory

```yaml
behavior_inventory:
  source: "free-coded commits (bundle-4e8020d6)"
  features:
    - name: "D1 data model (accounts/sites/revisions) + slug allocation + seed (REQ-10)"
      entry_point: "db/migrations/0002-0005, packages/site-schema/src/{slug,reserved-slugs,db-types}.ts"
      behaviors:
        - "forward migrations create accounts/sites/revisions with FKs and indexes"
        - "down migrations in db/migrations-down/ leave the REQ-10 schema empty"
        - "slug validation: 3-40 chars lowercase+digits+single hyphens; reserved set; collision suggestions"
        - "sites.slug UNIQUE globally; seed bootstraps platform account + 1stcontact site from site.json"
    - name: "web-fetch-safety consumer build hygiene (BUG-11)"
      entry_point: "packages/web-fetch-safety/src/{browser-budget,intent-token,rate-limit,types}.ts"
      behaviors:
        - "KVNamespace imported as a type; consumers (extractor) build without declaring workers-types"
    - name: "transcription digest robustness (REQ-37 server)"
      entry_point: "apps/control-app/src/operator/{transcribe-site,read-transcription-digest,registry}.ts"
      behaviors:
        - "stage-0 prior-digest eviction"
        - "digest write read-back verification (capturedAt) else digest_write_unverified"
        - "summary.assetFailures per-URL reason"
        - "read_transcription_digest not_ready status when absent"
    - name: "builder chat XGD-parity + streaming (REQ-36)"
      entry_point: "apps/control-app/src/chat.ts, packages/builder-ui/src/{chat-driver,components/chat-panel,store,main}.ts, public/builder.html"
      behaviors:
        - "SSE token/tool_call/tool_result/done/error; progressive assistant bubble"
        - "round Send<->Stop swap wired to AbortController; spinner removed"
        - "user-message markdown; rounded-pill 13px input; tool-use pane; bare-Enter-to-send"
    - name: "chat-loop tool-call failure integrity & surfacing (REQ-38 + REQ-37 client)"
      entry_point: "apps/control-app/src/chat.ts, packages/builder-ui/src/{chat-driver,components/chat-panel,store}.ts"
      behaviors:
        - "per-call try/catch: one throw yields ok:false, batch survives; apply_tool_call_threw log"
        - "pendingToolFailures panel + next-turn synthetic system-message re-injection"
    - name: "image-gallery@v1 module (REQ-41 module)"
      entry_point: "packages/framework/src/modules/image-gallery/*, registry.ts, index.ts"
      behaviors:
        - "grid (1:1) + masonry (CSS column-count) variants; columns/gap/spacing/surface dials"
        - "items[] 2..24 with image AssetRef + optional caption; responsive column collapse; lazy/async img, no JS"
    - name: "reproduce-a-website how-to names image-gallery (REQ-41 how-to)"
      entry_point: "docs/llm-context/reproducing-a-website.md, apps/control-app/src/llm-context.ts"
      behaviors:
        - "how-to + inlined mirror name image-gallery for sequential images and document items[] population"
```

## Coverage Map

```yaml
coverage_map:
  - feature: "D1 data model + slug + seed (REQ-10)"
    status: uncovered
    existing_stories: []
    notes: ["No persistence/multi-site capability exists; STORY-39 covers only the in-memory Site Zod contract -> new feature"]
  - feature: "web-fetch-safety build hygiene (BUG-11)"
    status: partial
    existing_stories: ["story-a0482aed (STORY-53)"]
    gaps: ["no AC asserts the package is consumable without leaking workers-types globals"]
  - feature: "transcription digest robustness (REQ-37 server)"
    status: partial
    existing_stories: ["story-f45a5e61 (STORY-58)"]
    gaps: ["eviction, write read-back verification, not_ready status, per-URL assetFailures not yet documented"]
  - feature: "builder chat XGD-parity + streaming (REQ-36)"
    status: partial
    existing_stories: ["story-ba9f2715 (STORY-46)"]
    gaps: ["streaming SSE, Send/Stop, user markdown, tool-use pane, Enter-to-send extend AC-486/581/673"]
  - feature: "chat-loop tool-call failure integrity (REQ-38 + REQ-37 client)"
    status: partial
    existing_stories: ["story-ba9f2715 (STORY-46)"]
    gaps: ["per-call survival on throw; failure panel + re-injection"]
  - feature: "image-gallery module (REQ-41 module)"
    status: partial
    existing_stories: ["story-f1e061ba (STORY-42)"]
    gaps: ["image-gallery not in the catalog membership/registry ACs"]
  - feature: "reproduce-a-website how-to image-gallery mention (REQ-41 how-to)"
    status: partial
    existing_stories: ["story-f45a5e61 (STORY-58)"]
    gaps: ["how-to does not yet name image-gallery for sequential images"]
```

## Plan Items

| # | Component | Type | Pts | Deps | Target |
|---|-----------|------|-----|------|--------|
| 1 | Site Data Model & Persistence (D1) | feature | 3 | - | (new) |
| 2 | External Fetch Safety (web-fetch-safety) | upgrade | 1 | - | STORY-53 |
| 3 | Convert Flow — digest robustness | upgrade | 2 | - | STORY-58 |
| 4 | Builder chat rebuild + streaming | upgrade | 3 | - | STORY-46 |
| 5 | Chat-loop tool-failure integrity | upgrade | 2 | 4 | STORY-46 |
| 6 | Module catalog — image-gallery@v1 | upgrade | 2 | - | STORY-42 |
| 7 | Convert how-to names image-gallery | upgrade | 1 | 6 | STORY-58 |

## Observations

- **Parsimony / grouping**: 11 commits → 7 plan items. The 4 pure `package.json` version-bump commits carry no behavior and get no item. REQ-37 splits across two items because its server digest-robustness belongs to the convert capability (STORY-58) while its client failure-panel/re-injection belongs to the builder-chat capability (STORY-46), where it joins REQ-38's per-call integrity fix (both harden chat-loop tool-call failure handling). REQ-36 and the REQ-37-client+REQ-38 work both upgrade STORY-46 but are kept as two items: distinct user-visible capabilities (UX/streaming vs. failure integrity) and REQ-38 structurally depends on REQ-36's SSE refactor (dep 5->4).
- **REQ-10 is the only feature**: no existing capability covers persistence (accounts/sites/revisions), slug allocation in the *.1stcontact.io namespace, or the bootstrap seed. STORY-39 (CAP-32) is explicitly the in-memory Site Zod contract and does not plausibly absorb a D1 data model, so reuse-first does not apply.
- **Two items target STORY-58** (#3 digest robustness, #7 how-to mention) and **two target STORY-46** (#4, #5). Each modifies a disjoint AC set; ordering is via dependencies where structural (5->4) and logical (7->6, the how-to only makes sense once the module exists).
- **BUG-11 is a thin but real behavior**: a type-only import that changes whether downstream packages compile. It is genuinely a property of the web-fetch-safety package (CAP-44), captured as a 1-pt consumer-build-hygiene AC on STORY-53 rather than the deploy-pipeline story (STORY-38), since the invariant is owned by the package, not the build orchestration.
- **FC tests on disk** (not in the pre-fed fc_tests list, which was empty): test_UAT_FC_BUG-11_*, test_UAT_FC_REQ-10_* (8 files), test_UAT_FC_REQ-37_* (5), test_UAT_FC_REQ-36_* (5), test_UAT_FC_REQ-38_*, test_UAT_FC_REQ-41_* (7 incl. llm_context_doc_mentions_image_gallery). Every one is covered by a plan item above so the downstream story cycle can promote each to a formal AC and rename it; no FC orphans should remain.
- **Coordination note (REQ-10)**: extractAccountId remains header-driven; the swap to session/magic-link resolution is explicitly deferred to the auth REQ and is out of scope for this reconciliation.
- **Out of scope / no regression flagged**: all touched code falls within the declared intent of its owning ticket; no unrelated areas were modified, so no Case-3 regression notes are warranted.