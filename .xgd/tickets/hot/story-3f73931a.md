---
uid: story-3f73931a
id: STORY-55
type: story
title: Extract a reference website's design signals into a canonical Reference Digest
created_by: xgd
created_at: '2026-06-27T01:09:57.646726+00:00'
updated_at: '2026-06-30T06:11:33.290705+00:00'
completed_at: null
last_field_updated: updated_by
status: updated
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-9395ee51
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-24c4d23c
  - bundle-30021526
  - bundle-93cd5926
---

## Story

**As an** operator who wants to reproduce an existing website using the platform framework (with the AI assistant helping me),
**I want** the reference site's visible design characteristics — colour palette, typography, layout, imagery/asset inventory, and content structure — captured deterministically into one structured Reference Digest with a human-readable markdown rendering, with the static capture also fetching external stylesheets to recover `background-image` assets, and the JS-rendered capture — invoked on every analysis — resolving computed CSS, discovering further computed background images, capturing embedded `@font-face` web-font files, recording bounding boxes for key page regions (hero, nav, sections, cards), and taking mobile/tablet/desktop screenshots,
**so that** I and the AI reason about the same evidence and can see exactly which design signals were detected and which are missing, even for single-page-app shells whose content only appears after the page renders.

## Description

This story formalises the `packages/extractor` library: the canonical Reference Digest data contract, the deterministic ("Layer A") extractors that turn a fetched HTML document into that contract, the markdown renderer that projects it for human reading, and the Browser-Rendering path that fills the gaps the static parse cannot resolve.

In scope:
- A stable, versioned Reference Digest schema (schemaVersion 1) covering palette, typography, layout (including an optional per-region `boundingBoxes` structure for hero/nav/sections/cards from the rendered path), imagery, content, and a per-asset inventory whose records carry a `kind` of `img | background | video | font` — exported as a validator so downstream consumers can validate digests.
- Five deterministic extractors that derive each signal category from HTML + a base URL, using only the document's own markup and `<style>`/inline CSS for palette, typography, layout, and content (no computed layout, no LLM).
- An external-stylesheet enrichment step on the static path: each `<link rel="stylesheet">` is fetched through the shared fetch-safety layer and parsed for `background-image` url() values (including those inside `@media` rules), which are folded into the asset inventory as `kind: 'background'` records. This is the only signal category the static path resolves from network resources beyond the document itself; url() values resolve relative to the stylesheet, `data:` URLs are filtered, and `@import` chains are not followed (documented limitation). This recovers hero/banner backgrounds declared only in external CSS (BUG-13) without requiring a browser.
- The "absence as content" property: every individual signal field serialises as the literal string `not_detected` (or its array/typed equivalent) rather than being omitted or null, so a sparse page still produces a complete, readable digest.
- A deterministic baseline "what's missing" list derived from absent signals (used as the fallback when no AI commentary pass runs).
- A KMS-aware markdown renderer producing the DOC-9 §9 shape (single H1 title, blockquote summary, table of contents, numbered sections per signal category, per-kind asset inventory, "What's missing" section).
- A rendered fetch path driven through an injectable browser-driver boundary (production wraps Cloudflare's `@cloudflare/puppeteer` `BROWSER` binding; tests inject a deterministic fake driver) that navigates, waits for hydration (`networkidle0`, 10 s budget), captures three full-page screenshots (mobile 390×844, tablet 820×1180, desktop 1440×900), and runs an in-page extraction script that reads computed styles, computed `background-image` URLs, `@font-face`/`document.fonts` web-font URLs, and hero/nav/section/card bounding boxes. The extractor exposes this rendered fetch unconditionally; the analyze action invokes it on every call rather than gating it behind a decision. There is **no** escalation heuristic in this package — no `shouldEscalateToRendered` primitive and no `escalate.ts` module; the static-vs-rendered decision is no longer made here (the rendered path always runs, with static as the analyze action's degraded fallback).
- A computed-CSS merge that refines the Layer A signals: computed typography (family/size/weight for body/h1/h2/h3) and computed palette background-color override the declared values when present, and computed `background-image` URLs the static parse missed are folded into the asset inventory as `kind: 'background'` records (deduped by absolute URL, incrementing the `references` count rather than duplicating). The same merge also folds rendered-time `@font-face` web-font URLs into the inventory as `kind: 'font'` records (deduped by absolute URL, the font family recorded on the record, `data:` URLs excluded) and attaches the rendered-path bounding boxes for hero/nav/sections/cards to `layout.boundingBoxes`, preserving the existing `maxContentWidth`/`bias`/`density` layout fields.
- A screenshot upload step that writes the mobile/tablet/desktop PNGs to the `references/{chatId}/{turnId}/{viewport}.png` keyspace of the shared assets bucket, dropping any viewport whose PNG exceeds an 8 MB cap and returning the keys for the produced viewports.

Out of scope (owned elsewhere):
- Fetching the URL, SSRF/scheme safety, robots, rate limiting, browser budget, operator-intent tokens, and KV digest caching (External Fetch Safety / Operator API). The static external-stylesheet enrichment reuses that same fetch-safety layer; the safety policy itself remains owned there.
- The `analyze_page` operator action that orchestrates fetch → static external-stylesheet enrichment → rendered driver → merge → screenshot upload → AI commentary, the decision to run the rendered path on every call, the multimodal commentary pass itself, and the `BROWSER` binding production scoping (owned by the analyze_page story, same bundle).
- The `DigestReport` chat-card UI that renders the digest (and its screenshot strip) to the operator.

## Technical Context

- Grounded in REQ-21 (bundled as bundle-bbb1bd9c) and extended by REQ-22 (this bundle). The operator's stated goal: "reproduce their site so it looks as identical as possible using our framework; if there are gaps we need to understand what they are." The expanded asset inventory (img + srcset + inline background-image + `<style>` background-image + external-stylesheet background-image + computed external-stylesheet background-image + `@font-face` web fonts + video/source) exists so the transcription step (REQ-28) has the full candidate set of visual assets to mirror.
- BUG-13 reconciliation note: external-stylesheet background discovery is split across two paths. The static path (this story's `packages/extractor` enrichment) fetches each `<link rel=stylesheet>` and parses its CSS text for `background-image` url() values without a browser. The rendered path (AC-613) discovers further background images via computed styles. Both fold into the same asset inventory using the same dedup-by-URL/`references`-increment merge, so a URL found on both paths yields a single record.
- Rendered-path fonts + layout boxes: the rendered fetch surfaces two further signal categories beyond computed typography/palette/backgrounds — (1) `@font-face` web-font file URLs, read from `document.styleSheets` `CSSFontFaceRule` entries and the `document.fonts` Font Loading API, resolved to absolute URLs and merged into the asset inventory as `kind: 'font'` records; and (2) viewport bounding boxes for hero/nav/sections/cards (desktop viewport, pixel coordinates including scroll offset; zero-area/offscreen elements omitted) exposed on `layout.boundingBoxes`. Both reuse the same computed-signal merge and dedup-by-URL pattern as the computed background images (AC-613).
- **Reconciliation note (render-by-default is now ground truth):** earlier reconciliations of this story treated the escalation heuristic (`shouldEscalateToRendered` with thin-body / JS-dominant / force-rendered conditions, in `packages/extractor/src/escalate.ts`) as ground truth and deferred the render-by-default amendment to a future REQ. BUNDLE-10 (REQ-53, commit 72effe61) reconciles that amendment: `escalate.ts` and the `shouldEscalateToRendered` export were deleted from `packages/extractor`, and the rendered fetch is now invoked unconditionally by the analyze action. The escalation-decision ACs (former AC-597 / AC-610 / AC-611) are archived; the rendered-fetch primitive itself (AC-612 and the computed-signal merge / screenshot upload ACs) is unchanged and now runs on every call.
- Convergence principle (DOC-9 §3): the same digest artifact serves both the operator and the AI. The markdown rendering and the structured schema are two projections of one source of truth.
- Consumed by the analyze_page action (same bundle) and downstream by REQ-28 (transcription input contract) and REQ-29 (multi-page crawl). The exported schema validator is the input contract REQ-28 relies on.
- HTML parsing runs via a DOM library that works in both the test (jsdom-like) environment and Cloudflare Workers, so the package is isolation-portable. The rendered path keeps the library pure: the extractor defines the `BrowserDriver` interface and the in-page extraction script as a string, and the control-app supplies the concrete puppeteer-backed driver; tests inject a fake driver, so no real browser is spun up under test. The external-stylesheet enrichment is likewise injection-driven: the extractor defines a `StylesheetFetcher` boundary and the control-app supplies a `safeFetch`-backed implementation.
- Intent/code divergence to flag for regression: REQ-21's IN section sketches `imagery: ImagerySignals` as part of `signals`; the implementation splits this into a summary `imagery` object (img/background/video counts + heroDetected) plus a separate `assetInventory` array of per-asset records, with the background count recomputed after both the static external-stylesheet enrichment and the computed-CSS merge. This matches the operator's expanded-inventory decision in the 2026-06-18 planning chat and is the intended shape; the ACs below describe the implemented (and intended) split.

## Dependencies

None. (This is foundation work; the analyze_page + DigestReport story — same bundle — depends on this story.)

## Story Points

3