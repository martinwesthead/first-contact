---
uid: report-39aae917
id: REPORT-737
type: report
title: 'Reconciliation Plan: BUNDLE-5 (BUG-4/BUG-3/BUG-5/BUG-7/REQ-32/REQ-33/REQ-34/REQ-35/BUG-10/REQ-14)'
created_by: xgd
created_at: '2026-06-28T22:07:18.547683+00:00'
updated_at: '2026-06-28T22:24:59.827160+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-d4ce3987
  anchor_uid: bundle-d4ce3987
  items:
  - index: 1
    component: Builder UI — chat panel
    item_type: upgrade
    story_points: 1
    dependencies: []
    target_story_ids:
    - story-ba9f2715
    description: 'REQ-32: while a chat turn is in flight, the Send button is disabled,
      swaps its label for a CSS-only spinner, and sets aria-busy; repeat clicks and
      Cmd/Ctrl+Enter are suppressed; the editor stays editable; the button resets
      on both resolve and reject.'
    justification: STORY-46 documents the builder SPA chat panel but has no AC for
      in-flight send blocking. This extends the existing chat-panel capability bucket
      (no new screen/API), so it is an upgrade, not a feature.
    intent_delta_summary: 'Add in-flight send-blocking behaviour to the existing chat
      panel: disabled+spinner+aria-busy button, suppressed re-entry, editor stays
      editable, guaranteed reset on settle.'
    acceptance_criteria_changes:
      add:
      - Send button is disabled and shows a CSS-only spinner (aria-busy=true, data-fc-chat-send-busy)
        while onSend is pending.
      - A click or Cmd/Ctrl+Enter during an in-flight turn does not fire a second
        onSend; an empty input still no-ops before entering busy state.
      - The editor remains focusable/editable during the in-flight turn.
      - The button returns to the 'Send' label and re-enables after onSend resolves
        AND after it rejects (finally-cleared).
      modify: []
      remove: []
    story_uid: story-ba9f2715
  - index: 2
    component: Builder UI — live preview
    item_type: upgrade
    story_points: 2
    dependencies: []
    target_story_ids:
    - story-ba9f2715
    description: 'BUG-3: the framework renderer gains a target:''preview''|''production''
      option (default ''production'', production output unchanged); in preview mode
      page nav hrefs are emitted as ''#/<pageId>''. The preview iframe driver installs
      a hashchange listener and re-renders the matched page in-document with no HTTP
      round trip. In-page anchors do not switch pages; an unknown pageId falls back
      to the first page.'
    justification: STORY-46 owns the builder's live preview but documents only single-page
      preview; multi-page in-iframe navigation was never finished. This extends the
      existing preview capability (the renderer target option is an internal mechanism
      supporting it), so it is an upgrade.
    intent_delta_summary: Extend the live-preview capability with in-document multi-page
      navigation via a renderer preview target and an iframe hashchange page-switch
      driver; production rendering is unchanged.
    acceptance_criteria_changes:
      add:
      - 'renderSiteToHtml(site, { target: ''preview'' }) emits page nav links as ''#/<pageId>'';
        default / target:''production'' emits ''/<pageId>'' (production output byte-unchanged).'
      - Dispatching hashchange '#/<pageId>' on the preview iframe re-renders that
        page's modules without an HTTP request; '#/' returns to the home page.
      - In-page anchor hashes (e.g. '#contact') do not switch pages; an unknown pageId
        falls back to the first page.
      modify: []
      remove: []
    story_uid: story-ba9f2715
  - index: 3
    component: Deploy/build pipeline — dev tooling
    item_type: upgrade
    story_points: 1
    dependencies: []
    target_story_ids:
    - story-067dc2f8
    description: 'BUG-7: build-builder-bundle.mjs accepts --watch (esbuild context().watch(),
      logs ''Watching'') for incremental rebuilds; package.json adds build:bundle:watch
      and rewires the control-app dev script to run the watcher and wrangler concurrently,
      so editing packages/builder-ui or packages/framework source rebuilds public/_assets/builder.js
      without a manual build step.'
    justification: STORY-38 documents the monorepo build/deploy pipeline including
      the builder-bundle build step but not a dev watch mode. Adding watch+dev wiring
      extends that same pipeline capability bucket; it is an upgrade, not a new capability.
    intent_delta_summary: 'Document the dev watch-rebuild mode of the builder SPA
      bundle: --watch on the bundler script and a concurrently-driven dev script so
      source edits rebuild the bundle live.'
    acceptance_criteria_changes:
      add:
      - build-builder-bundle.mjs --watch runs esbuild in watch mode, logs 'Watching
        ...', and rebuilds public/_assets/builder.js when entry-graph source (builder-ui
        or framework) changes.
      - One-shot mode (no --watch) exits 0, logs the build, and writes a non-empty
        bundle.
      - The control-app dev script runs build:bundle:watch concurrently with wrangler
        dev so source edits surface in the browser without a manual build.
      modify: []
      remove: []
    story_uid: null
  - index: 4
    component: Framework — markdown content + verbatim capture
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'REQ-33: markdown body-content fields accept EITHER an inline string
      OR an AssetRef{kind:''text''} pointing at an R2 .md file. site-schema gains
      the kind:''image''|''text'' discriminator (default image) and a MarkdownContent
      union. The renderer sniffs HTML-passthrough (string starting with ''<''), otherwise
      converts markdown->HTML, and resolves text-AssetRefs via an injected resolveAsset
      (emitting alt fallback if absent). The extractor adds htmlToMarkdown + image-ref
      rewriting; transcribe_site Stage 5 writes per-page verbatim markdown to sites/{siteId}/copy/*.md
      (or inlines short blocks) and the digest carries copy/inlineMarkdown. A new
      write_text_asset operator action does key-guarded R2 writes; tools/generate
      prefetches and bakes resolved HTML into static output (no R2 at request time).
      The how-to instructs the AI to pass pre-built copy verbatim.'
    justification: No existing story covers markdown-as-content, text AssetRefs, verbatim
      mechanical capture, or render-time markdown conversion — this is a genuinely
      new capability bucket (the body-copy lingua franca) rather than an extension
      of an existing one, so it is a feature. It threads through schema/renderer/extractor/generate
      but introduces a new content shape that no current story documents.
    story_uid: null
  - index: 5
    component: Convert flow — orchestration
    item_type: upgrade
    story_points: 2
    dependencies: []
    target_story_ids:
    - story-b3866352
    description: 'REQ-35 + REQ-34 (server orchestration): transcribe_site no longer
      gates on a destructive-overwrite confirmation — the confirm_convert action,
      convertConfirmed consent storage, requires_confirmation early-return, and the
      ''I own this site'' robots-override-via-convert path are removed; conversion
      proceeds immediately. REQ-34 adds a Stage 0 clear: the handler builds a 1-page
      empty scaffold (default theme tokens, nav empty, config.businessName from the
      source title via titleFromDigest, else ''Untitled''), applies it to both server
      workingSite and the returned clearedSiteDefinition, and emits a stage 0 ''cleared''
      SSE event before mirror/digest. The robotsOverrides storage from REQ-20 is retained.'
    justification: 'These changes evolve the existing convert-orchestration capability
      in place (STORY-57): one path (confirmation gate) is removed and one (clear-to-scaffold)
      is added within the same bucket. No new capability bucket and no parallel orchestration
      is introduced, so it is an upgrade. REQ-35''s deletion supersedes STORY-57''s
      confirmation-gate ACs.'
    intent_delta_summary: Remove the confirmation/consent gate and its companion confirm_convert
      action from convert orchestration; add an unconditional Stage 0 clear-to-empty-scaffold
      (businessName from source title) that runs before mirror/digest and is mirrored
      to the FE store.
    acceptance_criteria_changes:
      add:
      - transcribe_site clears the draft to a 1-page empty scaffold (default theme,
        no modules, config.businessName from source title or 'Untitled') before the
        mirror/digest phase; the scaffold passes validateSite.
      - After a convert against a populated source, no prior-draft modules/pages/theme
        tokens survive (clear is unconditional).
      - A stage 0 'cleared' SSE event fires before any digest write; the cleared definition
        is returned and applied to the FE working store before subsequent state_edit
        calls.
      modify:
      - The convert action description no longer references a confirmation/consent
        step; transcribe_site proceeds on first invocation under any starting condition.
      remove:
      - The destructive-overwrite confirmation gate (first attempt returns a confirmation
        request; consent is per-URL/per-session).
      - The companion confirm_convert operator action and convertConfirmed consent
        storage.
      - The 'I own this site' assertion that registered a per-origin robots override
        through the convert flow (the underlying REQ-20 robotsOverrides storage is
        retained).
    story_uid: null
  - index: 6
    component: Convert flow — chat cards
    item_type: upgrade
    story_points: 2
    dependencies:
    - 5
    target_story_ids:
    - story-2524a1ae
    description: 'REQ-35 + BUG-10 + REQ-34 (builder chat cards): the ConvertConfirmation
      card (warning card, ''I own this site'' checkbox, Confirm/Cancel signalling,
      fc:convert-confirmed/cancelled bridge) is deleted along with its renderer registration.
      The TranscribeProgress card is now actually wired: bootBuilder calls registerTranscribeProgress()
      so transcribe_site_done renders the multi-stage card (with mirrored-asset list
      and failures-to-mirror) instead of the plain summary fallback. REQ-34 adds a
      Stage 0 ''Clearing draft'' row, making the stage list 5 rows (0..4); the row
      flips to ''cleared'' on the SSE event.'
    justification: STORY-61 documents the two convert chat-card variants. The net
      code keeps only the progress card and removes the confirmation card; this evolves
      the existing card capability in place (no new bucket), so it is an upgrade.
      REQ-35's deletion supersedes STORY-61's ConvertConfirmation ACs.
    intent_delta_summary: Drop the ConvertConfirmation card entirely; document the
      TranscribeProgress card as boot-registered (renders instead of summary fallback)
      with a 5-row stage list including a Stage 0 'Clearing draft' row.
    acceptance_criteria_changes:
      add:
      - bootBuilder registers registerTranscribeProgress() so the transcribe_site_done
        tool_result routes to the multi-stage progress card rather than the plain
        summary fallback.
      - The progress card stage list includes a Stage 0 'Clearing draft' row (5 rows,
        0..4) that flips to 'cleared' on the SSE event.
      modify:
      - No renderer is registered for kind 'convert_confirmation'; the dispatcher
        has no convert-confirmation route.
      remove:
      - 'The Convert confirmation card variant: warning-toned ''Convert site'' card,
        ''I own this site'' checkbox, Confirm/Cancel actions, and the fc:convert-confirmed
        / fc:convert-cancelled signalling contract.'
    story_uid: null
  - index: 7
    component: Convert flow — transcription digest
    item_type: upgrade
    story_points: 1
    dependencies: []
    target_story_ids:
    - story-f45a5e61
    description: 'BUG-5: buildTranscriptionDigest now emits a precomputed assetRef
      object on every assetInventory entry (id=r2Key, src=/assets/<r2Key>, alt=altText||'''')
      that validates against the canonical AssetRef schema, so the AI drops it straight
      into set_module_content for image fields. The reproducing-a-website how-to (and
      its inlined mirror) is corrected to instruct an AssetRef object rather than
      a bare ''/assets/{r2Key}'' string.'
    justification: STORY-58 documents the deterministic transcription-digest contract
      and asset inventory but not the precomputed image assetRef field; this extends
      that existing digest capability (no new bucket), so it is an upgrade.
    intent_delta_summary: Extend the digest's asset-inventory contract so each entry
      carries a ready-made, schema-valid image AssetRef, and align the how-to to instruct
      AssetRef objects for image fields.
    acceptance_criteria_changes:
      add:
      - Each digest assetInventory entry carries a precomputed assetRef {id:r2Key,
        src:'/assets/<r2Key>', alt:altText||''} that validates against the AssetRef
        schema.
      - docs/llm-context/reproducing-a-website.md (and the inlined llm-context.ts
        mirror) instruct the AI to set image fields to the precomputed AssetRef object,
        with a worked example, rather than a bare path string.
      modify: []
      remove: []
    story_uid: null
  - index: 8
    component: AI tool surface — nav/page/duplicate
    item_type: upgrade
    story_points: 2
    dependencies: []
    target_story_ids:
    - story-e893e643
    description: 'REQ-14: completes the AI editing tool surface with set_nav_pattern
      (enum-validated), set_nav_entries (wholesale replace), set_page_metadata (title/new_slug
      rename keeping page.id stable/seoMeta patch), and duplicate_module (same-page
      deep clone, refs duplicated by reference). Site.superRefine gains nav cross-ref
      validation (kind=page pageId must resolve; kind=anchor pageId+moduleId must
      resolve; unique labels). All four register as state_edit/plan_tier=trial; summarizeStateEdit
      yields descriptive summaries; the how-to and system-prompt rules expose the
      new tools.'
    justification: STORY-60 documents the AI page-management tools and explicitly
      scopes nav-entry editing and module duplication OUT as 'the remaining parts
      of the AI tool-surface-completion intent'. REQ-14 fills exactly that gap within
      the same AI-editing-tools bucket — an upgrade extending the existing tool surface,
      not a new capability bucket or parallel implementation.
    intent_delta_summary: Extend the AI editing tool surface (previously add/remove/reorder
      pages only) with nav editing, page metadata, and module duplication, plus the
      backing nav cross-reference validation and system-prompt/how-to exposure.
    acceptance_criteria_changes:
      add:
      - set_nav_pattern sets site.nav.pattern (enum-validated; unknown values rejected).
      - set_nav_entries replaces site.nav.entries wholesale with cross-ref validation
        (orphan page/anchor rejected, labels unique).
      - set_page_metadata updates title/seoMeta and renames via new_slug while keeping
        page.id stable (so nav pageId refs survive); slug collisions and invalid slugs
        rejected; at least one field required.
      - duplicate_module deep-clones an instance (new UUID; identical type/version/variant/dials/content;
        refs by reference) inserting after the source or named target; cross-page
        target rejected.
      - Site.superRefine enforces nav target cross-references site-wide; the how-to
        and system-prompt expose the four new tools (incl. a 'wire up the nav' convert
        step).
      modify:
      - Story scope no longer lists nav-entry editing and module duplication as out-of-scope;
        the AI editing tool surface now covers nav, page metadata, and duplication.
      remove: []
    story_uid: null
---

# Reconciliation Plan

**Mode**: commits
**Anchor**: bundle-d4ce3987 (BUNDLE-5) — bundles BUG-4, BUG-3, BUG-5, BUG-7, REQ-32, REQ-33, REQ-34, REQ-35, BUG-10, REQ-14
**Source**: 12 free-coded commits on reconcile-BUNDLE-5

## Intent Summary (Step 0)

The bundle gathers ten free-coded tickets touching the builder UI, the convert
flow, the framework renderer, the AI tool surface, and dev tooling. The dominant
net-state subtlety is **internal supersession**: BUG-4 (wire the
ConvertConfirmation Confirm/Cancel buttons + x-session-id) is explicitly
**superseded by REQ-35**, which deletes the destructive-confirmation gate
entirely. So BUG-4's card/listener/registerConvertConfirmation additions are
net-removed within the same bundle; only the x-session-id forwarding survives as
generic infrastructure. The matrix must reflect the **net end state**, not the
intermediate BUG-4 wiring.

## Behavior Inventory (Step 1)

```yaml
behavior_inventory:
  source: "12 free-coded commits (bundle-d4ce3987)"
  features:
    - name: "REQ-32 chat panel send-blocking"
      commits: [749ef9b]
      behaviors: ["disabled+spinner+aria-busy while in-flight", "suppress repeat click/Cmd+Enter", "editor stays editable", "reset on resolve and reject"]
    - name: "BUG-3 preview multi-page nav"
      commits: [ccfd392]
      behaviors: ["renderer target preview|production (default production unchanged)", "preview emits #/<pageId>", "iframe hashchange re-renders page in-document", "in-page anchors don't switch", "unknown pageId -> first page"]
    - name: "BUG-7 dev watch rebuild"
      commits: [4bd1609]
      behaviors: ["bundler --watch incremental rebuild", "dev runs watcher+wrangler concurrently", "one-shot still exits 0 + writes bundle"]
    - name: "REQ-33 markdown content union + verbatim capture"
      commits: [ee88607]
      behaviors: ["AssetRef kind image|text discriminator", "markdown content = string | AssetRef-text", "renderer HTML-sniff + markdown->HTML + resolveAsset", "htmlToMarkdown + image-ref rewrite", "transcribe Stage 5 writes copy/*.md + digest copy/inlineMarkdown", "write_text_asset operator action (key-guarded R2 write)", "tools/generate bakes resolved HTML statically"]
    - name: "REQ-35 remove confirmation gate (server)"
      commits: [58fce2b]
      behaviors: ["no requires_confirmation", "confirm_convert action removed", "convertConfirmed storage removed", "robotsOverrides retained"]
    - name: "REQ-34 clear draft to empty scaffold"
      commits: [c54359d, 58fce2b]
      behaviors: ["Stage 0 builds 1-page empty scaffold", "businessName from source title", "applied to server workingSite + FE clearedSiteDefinition", "stage 0 'cleared' SSE event", "TranscribeProgress Stage 0 row"]
    - name: "BUG-10 issue 1 register TranscribeProgress"
      commits: [65e79b6]
      behaviors: ["bootBuilder registers registerTranscribeProgress so transcribe_site_done renders multi-stage card not summary fallback"]
    - name: "BUG-5 digest precomputes image AssetRef"
      commits: [775351]
      behaviors: ["assetInventory entries carry assetRef{id,src,alt}", "how-to instructs AssetRef object for image fields"]
    - name: "REQ-14 AI tool surface completion"
      commits: [be61b26, c3f5924]
      behaviors: ["set_nav_pattern", "set_nav_entries", "set_page_metadata (id-stable rename)", "duplicate_module", "Site.superRefine nav cross-ref validation", "system-prompt/how-to exposure"]
    - name: "BUG-4 (SUPERSEDED net-no-op)"
      commits: [5242e88, 502d741]
      behaviors: ["card/listener/registerConvertConfirmation -> deleted by REQ-35", "x-session-id forwarding survives as infra"]
```

## Coverage Map (Step 3)

```yaml
coverage_map:
  - feature: "REQ-32 send-blocking"
    status: partial
    existing_stories: [story-ba9f2715]   # STORY-46 builder SPA
    gaps: ["no AC for in-flight send blocking"]
  - feature: "BUG-3 preview multi-page nav"
    status: partial
    existing_stories: [story-ba9f2715]   # STORY-46 live preview
    gaps: ["preview documents single-page only; in-iframe page switching unfinished"]
  - feature: "BUG-7 dev watch"
    status: partial
    existing_stories: [story-067dc2f8]   # STORY-38 deploy/build pipeline
    gaps: ["no dev watch-rebuild mode documented"]
  - feature: "REQ-33 markdown content union"
    status: uncovered
    existing_stories: []
    gaps: ["new capability bucket: markdown content, text AssetRefs, verbatim capture, render-time conversion, write_text_asset, static baking"]
  - feature: "REQ-35 + REQ-34 orchestration"
    status: partial
    existing_stories: [story-b3866352]   # STORY-57 convert orchestration
    gaps: ["confirmation gate ACs now superseded (must be removed)", "clear-to-scaffold Stage 0 not documented"]
  - feature: "REQ-35 + BUG-10 + REQ-34 chat cards"
    status: partial
    existing_stories: [story-2524a1ae]   # STORY-61 convert chat cards
    gaps: ["ConvertConfirmation card ACs superseded (remove)", "TranscribeProgress now boot-registered + Stage 0 row"]
  - feature: "BUG-5 image assetRef"
    status: partial
    existing_stories: [story-f45a5e61]   # STORY-58 transcription digest
    gaps: ["digest assetInventory precomputed assetRef + how-to image instruction"]
  - feature: "REQ-14 nav/page/duplicate tools"
    status: partial
    existing_stories: [story-e893e643]   # STORY-60 AI page-management tools
    gaps: ["nav editing + page metadata + duplicate_module explicitly out-of-scope in STORY-60; now implemented"]
  - feature: "BUG-4"
    status: covered
    existing_stories: [story-2524a1ae, story-b3866352]
    notes: ["Net-removed by REQ-35; no plan item. x-session-id survives as infra with no current user-visible consumer."]
```

## Plan Items

| # | Component | Type | Pts | Deps | Target story | Source |
|---|-----------|------|-----|------|--------------|--------|
| 1 | Builder UI — chat panel | upgrade | 1 | - | STORY-46 | REQ-32 |
| 2 | Builder UI — live preview | upgrade | 2 | - | STORY-46 | BUG-3 |
| 3 | Deploy/build pipeline — dev tooling | upgrade | 1 | - | STORY-38 | BUG-7 |
| 4 | Framework — markdown content + capture | feature | 3 | - | (new) | REQ-33 |
| 5 | Convert flow — orchestration | upgrade | 2 | - | STORY-57 | REQ-35 + REQ-34 |
| 6 | Convert flow — chat cards | upgrade | 2 | 5 | STORY-61 | REQ-35 + BUG-10 + REQ-34 |
| 7 | Convert flow — transcription digest | upgrade | 1 | - | STORY-58 | BUG-5 |
| 8 | AI tool surface — nav/page/duplicate | upgrade | 2 | - | STORY-60 | REQ-14 |

## Observations

- **Internal supersession (BUG-4 -> REQ-35).** BUG-4 (commits 5242e88, 502d741)
  wired the ConvertConfirmation card and threaded x-session-id; REQ-35 (58fce2b)
  then deleted the entire confirmation gate, including BUG-4's renderer
  registration, listener bridge, and the gate's UATs. Net effect: no plan item
  for BUG-4 itself. Items 5 and 6 carry the **removal** of the now-superseded
  confirmation ACs from STORY-57 and STORY-61 respectively. BUG-4's body already
  records it as obsolete/closed.
- **x-session-id forwarding survives but has no user-visible consumer.** REQ-35
  removed the only operator action (transcribe_site convert-consent) that read
  session_id. runChatTurn still forwards x-session-id and bootBuilder still mints
  a per-tab session id. This is latent infrastructure; it fails the
  justification test (no user-visible capability today), so it is intentionally
  NOT made a plan item — noted here for traceability.
- **REQ-34/REQ-35 split across two stories.** REQ-35's deletion and REQ-34's
  Stage-0 clear each touch both the server orchestration (STORY-57) and the
  builder chat cards (STORY-61). The plan splits them by owning story rather than
  by ticket so each upgrade stays within one capability bucket.
- **BUG-10 is partial.** Only issue 1 (registerTranscribeProgress wiring) landed
  in this bundle (65e79b6); issue 2 (blank-iframe / add_module explicit-id) was
  explicitly deferred and is not in these commits, so it is not planned here.
- **BUG-3 commit-message mislabel.** Commit ccfd392's subject references
  REQ-648/xgd_version_bump, but its contents are the BUG-3 preview fix (a
  `git add -A` sweep documented in the BUG-3 body). Code is read via cherry-pick,
  so behaviour is correct; item 2 documents the BUG-3 behaviour.
- **REQ-33 vs BUG-5.** REQ-33 (markdown/text body copy) and BUG-5 (image
  AssetRef) are independent halves of the verbatim-reproduction goal. REQ-33 is a
  new capability bucket (feature, item 4); BUG-5 extends the existing digest
  contract (upgrade, item 7).
- **Every FC test file maps to a plan item** (REQ-32, BUG-3, BUG-5, BUG-7,
  REQ-33, REQ-34, REQ-35, BUG-10, REQ-14). BUG-4's FC tests were deleted by
  REQ-35, so no FC orphan remains.