---
uid: report-5f4132d1
id: REPORT-840
type: report
title: 'Reconciliation Plan: BUNDLE-8 (REQ-44 + REQ-46 + BUG-13 + REQ-49)'
created_by: xgd
created_at: '2026-06-30T00:46:13.495951+00:00'
updated_at: '2026-06-30T01:11:31.700892+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-30021526
  anchor_uid: bundle-30021526
  items:
  - index: 1
    component: Framework Module Catalog — services-grid v2
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'services-grid upgraded in place from v1 (text-only) to v2: new one-col
      variant; item field renames icon->image (asset-ref only, no string fallback)
      and title->heading; new section-level imageStyle dial (icon|cover|thumb) emitting
      matching item-image/image-style classes in both the Astro module and the SSR
      renderer (render/browser.ts); item count bounds lowered from 2..6 to 1..6; starter
      site (sites/1stcontact/site.json) migrated to the v2 contract; convert-flow
      LLM-context doc + inlined mirror gain a services-grid item-shape + imageStyle
      bullet.'
    justification: STORY-42 already owns services-grid behaviour (AC-429..AC-432).
      REQ-44 modifies that existing capability bucket in place (renamed item fields,
      new variant, new dial, changed item-count bounds) without introducing a parallel
      module or new bucket. The v1->v2 bump is a breaking in-place evolution of the
      same module, so this is an upgrade, not a new feature.
    story_uid: story-f1e061ba
    target_story_ids:
    - story-f1e061ba
    acceptance_criteria_changes:
      modify:
      - 'AC-432: change accepted item-count bounds from 2..6 to 1..6 (one-col feature
        callouts allow a single item).'
      add:
      - services-grid one-col variant renders a single full-width feature-callout
        card in a narrow container.
      - services-grid item schema requires an asset-ref image (no string fallback)
        and a heading, with optional markdown body and optional cta {label,href};
        item field validation rejects a string in the image field and a missing heading.
      - services-grid imageStyle dial (icon|cover|thumb) maps to the corresponding
        image-style class on rendered cards (icon=small square pictogram default,
        thumb=6rem square, cover=16:9 top-bleed).
      - Framework module registry resolves services-grid at its v2 declared version.
      - Convert-flow LLM-context documentation (canonical how-to + byte-for-byte inlined
        runtime mirror) documents the services-grid item shape ({heading, body, image?,
        cta?}) and the imageStyle dial, staying in sync across both copies.
      remove: []
    intent_delta_summary: 'Extend STORY-42''s services-grid coverage from the v1 text-only
      contract to the v2 contract: add one-col variant, image/heading item fields
      (asset-ref-only image), imageStyle dial, 1..6 item bounds, v2 registration,
      and convert-flow LLM-context documentation; modify the existing item-count AC
      from 2..6 to 1..6. The collapse-to-single-column-below-md behaviour (AC-431)
      is preserved unchanged. No new module or parallel implementation is introduced.'
  - index: 2
    component: Dev Tools — xgd_ticket AI system action + localhost sidecar
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'New dev-only capability letting the Anthropic-API-driven builder
      chat AI run a constrained xgd ticket allowlist against this project. A new workspace
      package tools/dev-tools-server (@1stcontact/dev-tools-server) exposes a 127.0.0.1
      HTTP sidecar that validates command in {create,list,get}, guards the configured
      cwd against escaping the first-contact project root (path-segment comparison,
      not prefix-substring), and delegates spawning to an injected Spawner so rejected
      requests provably never spawn. A new xgd_ticket system_action in OPERATOR_ACTIONS
      (apps/control-app/src/operator/xgd-ticket.ts) re-validates the command, requires
      args:string[], POSTs to the sidecar (default http://127.0.0.1:7878/xgd-ticket,
      override DEV_TOOLS_URL), and surfaces {ok,stdout,stderr,exitCode} as a kind-tagged
      ActionResult so the chat tool_result renderer and the AI''s next turn can read
      stdout. Visibility is gated: visibleToolSpecs({devToolsEnabled}) filters the
      spec out unless env.DEV_TOOLS_ENABLED==="true"; the handler re-checks the flag
      as defence in depth so even a forced tool_use fails closed without contacting
      the sidecar. Production chat sessions cannot reach 127.0.0.1 and never see the
      tool.'
    justification: No existing story covers a dev-only AI tool that proxies xgd ticket
      commands, nor the localhost sidecar package, the command allowlist + cwd guard,
      or the DEV_TOOLS_ENABLED visibility gate. STORY-51 owns the generic operator
      action dispatch namespace (registry, plan-tier auth, SSE) and STORY-60 owns
      state-edit site-editing tools — neither describes this system_action, its sidecar,
      or the dev-tools gating dimension. This is a genuinely new capability bucket
      (a developer-only ticketing bridge), so it is a feature rather than an upgrade.
      The devToolsEnabled gate exists solely to serve this tool and is folded in here
      rather than split into a tiny STORY-51 upgrade.
    story_uid: story-d44dfd7c
  - index: 3
    component: Reference Digest Extraction — external-stylesheet backgrounds (static
      path)
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'The static (Layer A) extraction path now discovers background-image
      assets declared in external stylesheets (<link rel=stylesheet>), closing the
      BUG-13 gap where hero/banner CSS backgrounds were silently dropped because parseImagery
      only walked inline style attributes and <style> blocks. New module packages/extractor/src/external-stylesheets.ts:
      extractExternalStylesheetAssets fetches each linked stylesheet through safeFetch,
      parses it with the existing walkCssRules (covers @media), and yields kind=background
      AssetRecords; mergeStylesheetAssets folds them into Signals via dedup-by-URL
      (existing entries get references++, imagery.backgroundCount updated). url()
      values resolve relative to the stylesheet URL per CSS spec; data: URLs filtered;
      @import chains not followed (documented limitation). Wired into apps/control-app/src/operator/analyze-page.ts
      between extractSignals and the rendered-pass merge so both the rendered merge
      and the digest see the enriched static inventory.'
    justification: STORY-55 owns the deterministic Reference Digest extractors and
      explicitly scoped them to 'no external stylesheets'. BUG-13 modifies that existing
      capability in place by extending the static path to fetch and parse external
      stylesheets for background images. This extends the existing extraction bucket
      rather than adding a new one, and is distinct from AC-613 which covers background
      images discovered via the rendered/computed-style path. It is therefore an upgrade
      adding a new AC to STORY-55.
    story_uid: null
    target_story_ids:
    - story-3f73931a
    acceptance_criteria_changes:
      add:
      - 'The static extraction path fetches each external stylesheet (<link rel=stylesheet>)
        through the fetch-safety layer, extracts background-image url() values (including
        those inside @media rules), and adds them to the asset inventory as kind=background
        records — resolving url() relative to the stylesheet, deduping by URL (incrementing
        references for existing entries), filtering data: URLs, and not following
        @import chains.'
      modify: []
      remove: []
    intent_delta_summary: 'Add one AC to STORY-55 documenting static-path external-stylesheet
      background-image discovery. This narrows the story''s prior ''no external stylesheets''
      static-scope statement: the static extractors now fetch external CSS for background
      images while computed/rendered background discovery (AC-613) remains the separate
      rendered-path behaviour. No new capability bucket; reuses walkCssRules and the
      existing dedup-by-URL merge pattern.'
  - index: 4
    component: Reference Digest Extraction — rendered-fetch @font-face fonts + layout
      bounding boxes
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'The rendered (Browser-Rendering) capture is extended to surface
      two new signal categories. rendered-fetch.ts COMPUTED_EXTRACTION_SCRIPT now
      captures @font-face font-file URLs (walking document.styleSheets CSSFontFaceRule
      plus document.fonts FontFace.src) and bounding boxes for hero/nav/sections/cards;
      new ComputedFontAsset / ComputedBoundingBoxes types on DriverResult; the real
      puppeteer driver (browser-driver.ts) maps the extended in-page result into that
      shape. merge.ts mergeComputedSignals takes an optional extras arg: font URLs
      land in assetInventory as kind=font AssetRecords (dedup-by-URL, family on alt)
      and bounding boxes hang off signals.layout.boundingBoxes. schema.ts adds ''font''
      to AssetKind and BoundingBox/LayoutBoundingBoxes zod schemas with an optional
      boundingBoxes field on LayoutSignals.'
    justification: STORY-55 owns the rendered/computed extraction path and its asset
      inventory + layout signals. REQ-49 extends that existing capability with two
      new computed signals (font-file URLs and element bounding boxes) merged through
      the same patterns AC-613 already established for computed background images.
      This extends the existing extraction bucket in place, so it is an upgrade adding
      ACs to STORY-55, not a new feature.
    story_uid: null
    target_story_ids:
    - story-3f73931a
    acceptance_criteria_changes:
      add:
      - The rendered fetch captures @font-face font-file URLs (via document.styleSheets
        CSSFontFaceRule and document.fonts) and merges them into the asset inventory
        as kind=font records (dedup-by-URL, font family recorded on the record).
      - The rendered fetch records bounding boxes for hero, nav, sections, and cards
        and exposes them on signals.layout.boundingBoxes, preserving the existing
        layout signal fields.
      modify:
      - Add 'font' as a valid AssetKind in the Reference Digest schema (extends the
        schema-conformance / asset-inventory coverage).
      remove: []
    intent_delta_summary: Add two ACs to STORY-55 for rendered-path @font-face font-asset
      capture and layout bounding-box capture, and extend the schema's AssetKind enum
      with 'font'. Reuses the computed-signal merge + dedup-by-URL patterns of AC-613;
      no new capability bucket or parallel extractor.
  - index: 5
    component: Site Transcription — force-rendered digest upgrade + screenshotUrl
      in transcription digest
    item_type: upgrade
    story_points: 2
    dependencies:
    - 4
    description: 'transcribe_site no longer transcribes blind off a static-only cached
      digest. transcribe-site.ts now upgrades any cached ReferenceDigest with fetchPath="static"
      via the existing renderedFetch path (for the home digest and every same-origin
      nav-linked page), gated by BROWSER_BUDGET_KV, and writes the upgraded digest
      back to FETCH_CACHE_KV so subsequent read_transcription_digest calls see the
      rendered view. Best-effort: a missing BROWSER binding, exhausted budget, or
      driver failure logs a notify event and falls through to the static digest. Separately,
      the transcription digest contract gains a per-page screenshotUrl = "/assets/"
      + screenshotKey (transcribe.ts TranscriptionDigestPerPage) so the chat AI reading
      the transcription digest has a stable URL to pass to Anthropic vision without
      reverse-engineering the /assets/ routing.'
    justification: Both behaviours extend existing convert/transcription capabilities
      in place. STORY-57 owns the mechanical convert-flow orchestration that produces/persists
      the per-site TranscriptionDigest; forcing a rendered upgrade of a static-cached
      digest before building the digest is an extension of that orchestration. STORY-58
      owns the transcription digest contract and read-back; adding a per-page screenshotUrl
      field is an extension of that contract. No new capability bucket or parallel
      flow is introduced, so this is an upgrade. It depends on item 4 because the
      upgraded rendered digest carries the new computed signals (fonts/bounding boxes)
      merged there.
    story_uid: null
    target_story_ids:
    - story-b3866352
    - story-f45a5e61
    acceptance_criteria_changes:
      add:
      - 'STORY-57: When the cached digest has fetchPath="static", transcribe_site
        runs the rendered path (home + same-origin nav pages, gated by the browser
        budget) and writes the upgraded digest back to the fetch cache before building
        the TranscriptionDigest; a missing BROWSER binding, exhausted budget, or driver
        failure degrades best-effort to the static digest with a notify event rather
        than failing the transcription.'
      - 'STORY-58: Each per-page transcription digest entry exposes screenshotUrl
        = "/assets/" + screenshotKey when a screenshot key is present, and an empty
        value when none exists.'
      modify: []
      remove: []
    intent_delta_summary: Add one AC to STORY-57 (transcribe_site force-upgrades a
      static-cached digest to rendered, persists it back, best-effort fallback) and
      one AC to STORY-58 (per-page screenshotUrl on the TranscriptionDigest contract).
      Both extend existing convert/digest capabilities in place; neither introduces
      a new bucket. screenshotUrl is the digest-contract owner (STORY-58); the force-rendered
      orchestration is the convert-flow owner (STORY-57).
---

# Reconciliation Plan

**Mode**: commits
**Anchor**: bundle-30021526 (BUNDLE-8 — REQ-44 + REQ-46 + BUG-13 + REQ-49)
**Subject (intent)**: bundle-30021526 (bundle is a first-class reconcile intent type; plan items cover all bundled child-intent commits)

The bundle aggregates four independently free-coded intents. The eleven commits are eight content commits plus three version bumps (0.0.25->0.0.30, no behaviour). Each intent maps to existing capability stories; only the dev-tools sidecar (REQ-46) is a genuinely new capability bucket.

## Behavior Inventory

```yaml
behavior_inventory:
  source: "commits: bcee4ed (REQ-44), 3484fb1+35eeb8d+da05c3e (REQ-46), 9ebaf2c (BUG-13), 7669308 (REQ-49); 3 version-bump commits carry no behaviour"
  features:
    - name: "services-grid@v2 (REQ-44)"
      entry_point: "packages/framework/src/modules/services-grid + render/browser.ts"
      behaviors:
        - "one-col variant: single full-width feature-callout card, narrow container"
        - "item fields renamed icon->image (asset-ref only, no string fallback), title->heading"
        - "imageStyle dial icon|cover|thumb -> image-style classes (icon default; thumb 6rem; cover 16:9 top-bleed)"
        - "item count bounds 2..6 -> 1..6"
        - "starter site sites/1stcontact/site.json migrated to v2"
        - "convert-flow LLM-context doc + inlined mirror gain services-grid item-shape + imageStyle bullet"
    - name: "xgd_ticket dev tool + sidecar (REQ-46)"
      entry_point: "tools/dev-tools-server/* + apps/control-app/src/operator/xgd-ticket.ts + registry.ts + chat.ts"
      behaviors:
        - "sidecar validates command in {create,list,get}; rejected -> never spawns"
        - "sidecar guards cwd against escaping first-contact root (path-segment, defeats prefix-substring)"
        - "xgd_ticket system_action POSTs {command,args} to 127.0.0.1:7878 (override DEV_TOOLS_URL)"
        - "result surfaced as kind=xgd_ticket_result ActionResult {ok,stdout,stderr,exitCode}; AI can read stdout"
        - "visibleToolSpecs({devToolsEnabled}) hides tool unless DEV_TOOLS_ENABLED==='true'"
        - "handler re-checks flag (defence in depth): forced tool_use fails closed without contacting sidecar"
        - "failure propagation: non-2xx / fetch throw / non-JSON body -> ActionResult status failed"
    - name: "external-stylesheet backgrounds, static path (BUG-13)"
      entry_point: "packages/extractor/src/external-stylesheets.ts + operator/analyze-page.ts"
      behaviors:
        - "fetch each <link rel=stylesheet> via safeFetch, walkCssRules (incl @media)"
        - "extract background-image url() -> kind=background AssetRecords"
        - "dedup-by-URL (references++), imagery.backgroundCount updated"
        - "url() resolves relative to stylesheet; data: filtered; @import not followed"
    - name: "rendered-fetch fonts + bounding boxes (REQ-49)"
      entry_point: "packages/extractor/src/rendered-fetch.ts + merge.ts + schema.ts + operator/browser-driver.ts"
      behaviors:
        - "capture @font-face URLs via document.styleSheets CSSFontFaceRule + document.fonts -> kind=font assets"
        - "capture hero/nav/section/card bounding boxes -> signals.layout.boundingBoxes"
        - "schema: 'font' AssetKind, BoundingBox/LayoutBoundingBoxes, optional boundingBoxes on LayoutSignals"
    - name: "transcribe_site force-rendered + screenshotUrl (REQ-49)"
      entry_point: "apps/control-app/src/operator/transcribe-site.ts + packages/extractor/src/transcribe.ts"
      behaviors:
        - "static-cached digest upgraded via renderedFetch (home + same-origin nav pages), gated by BROWSER_BUDGET_KV"
        - "upgraded digest written back to FETCH_CACHE_KV for later read_transcription_digest"
        - "best-effort: missing BROWSER / exhausted budget / driver failure -> notify event, fall through to static"
        - "TranscriptionDigestPerPage.screenshotUrl = /assets/<screenshotKey> (empty when no key)"
```

## Coverage Map

```yaml
coverage_map:
  - feature: "services-grid@v2 (REQ-44)"
    status: partial
    existing_stories: ["story-f1e061ba (STORY-42)"]
    existing_acs: ["AC-429","AC-430","AC-431","AC-432"]
    gaps: ["one-col variant","image/heading item fields (asset-ref only)","imageStyle dial","1..6 bounds (AC-432 says 2..6)","v2 registration","LLM-context doc bullet"]
  - feature: "xgd_ticket dev tool + sidecar (REQ-46)"
    status: uncovered
    existing_stories: []
    notes: ["relates to STORY-51 dispatch + STORY-60 tool surface but neither documents this dev-only system_action, the sidecar, the allowlist/cwd guard, or the DEV_TOOLS_ENABLED gate"]
  - feature: "external-stylesheet backgrounds static path (BUG-13)"
    status: partial
    existing_stories: ["story-3f73931a (STORY-55)"]
    existing_acs: ["AC-613 (computed/rendered backgrounds — different path)"]
    gaps: ["static-path external CSS background discovery; STORY-55 body says 'no external stylesheets' for static extractors"]
  - feature: "rendered-fetch fonts + bounding boxes (REQ-49)"
    status: partial
    existing_stories: ["story-3f73931a (STORY-55)"]
    existing_acs: ["AC-612/AC-613 (rendered driver + computed merge)"]
    gaps: ["@font-face font assets (kind=font)","layout bounding boxes","'font' AssetKind"]
  - feature: "transcribe_site force-rendered + screenshotUrl (REQ-49)"
    status: partial
    existing_stories: ["story-b3866352 (STORY-57)","story-f45a5e61 (STORY-58)"]
    existing_acs: ["AC-630 (persists digest)","AC-642 (read-back)"]
    gaps: ["force-rendered upgrade of static-cached digest + write-back","per-page screenshotUrl on the digest contract"]
```

## Plan Items

| # | Component | Type | Pts | Deps | Target | Description |
|---|-----------|------|-----|------|--------|-------------|
| 1 | services-grid v2 (REQ-44) | upgrade | 2 | - | STORY-42 | one-col variant, image/heading item fields, imageStyle dial, 1..6 bounds, v2 reg, LLM-context doc |
| 2 | xgd_ticket dev tool + sidecar (REQ-46) | feature | 3 | - | (new) | dev-only AI ticket proxy: sidecar allowlist+cwd guard, system_action routing, DEV_TOOLS_ENABLED gate, failure propagation |
| 3 | external-stylesheet backgrounds (BUG-13) | upgrade | 2 | - | STORY-55 | static path fetches external CSS, adds background-image url() to inventory |
| 4 | rendered-fetch fonts + bboxes (REQ-49) | upgrade | 2 | - | STORY-55 | @font-face -> kind=font assets; hero/nav/section/card bounding boxes; 'font' AssetKind |
| 5 | transcribe force-rendered + screenshotUrl (REQ-49) | upgrade | 2 | 4 | STORY-57, STORY-58 | upgrade static-cached digest to rendered + write-back; per-page screenshotUrl |

## Observations

- **Parsimony**: 11 commits reduce to 5 plan items. Three are version bumps (no behaviour). REQ-46's three commits (sidecar, handler, smoke-fix) form one coherent feature. REQ-49's two extractor concerns and two transcribe concerns split along story ownership (extractor vs convert vs digest-contract).
- **Upgrade-first**: 4 of 5 items are upgrades of existing stories; only the dev-tools sidecar is a new bucket. REQ-44 is an explicit in-place v1->v2 supersession (Step 3b Case 2) — AC-432's item-count bound is knowingly changed from 2..6 to 1..6.
- **BUG-13 vs AC-613 disambiguation**: AC-613 covers background images found via the *rendered/computed* path; BUG-13 adds discovery on the *static* path by fetching external CSS without a browser. Distinct behaviour, new AC, same story (STORY-55).
- **Item 4 -> item 5 dependency**: the rendered digest that transcribe_site writes back carries the fonts/bounding-boxes merged in item 4, so item 5 is sequenced after item 4.
- **FC test coverage**: every free-coded UAT on the commits maps to an item — REQ-44 (4 UATs)->item1; REQ-46 (7 UATs across sidecar+handler)->item2; BUG-13 (1 file, 8 ACs)->item3; REQ-49 font_face+bounding_boxes->item4, transcribe_site_forces_rendered+screenshot_url_in_digest->item5. (Prompt's on-disk fc_tests list was empty; coverage derived from the commit evidence.)
- **Commit-hygiene notes (no plan impact)**: REQ-44's discarded version-bump 208ee0c and the parallel-session LLM-context sweep are documented in the bundle body; the canonical owner of the services-grid LLM-context bullet is REQ-44 (item 1), mirroring the AC-774 precedent for image-gallery.
- **No regression items created** for code the bundled intents do not own (Step 3b Case 3): none observed — every touched area maps to a bundled intent.