---
uid: request-c765dd64
id: REQ-22
type: request
title: 'Browser Rendering integration: JS-rendered fetch path with screenshots and
  computed-CSS signals'
created_by: xgd
created_at: '2026-06-16T23:26:13.165904+00:00'
updated_at: '2026-06-19T01:17:34.328530+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  priority: high
  story_points: 6
  auto_merge_back: true
  needs_review: false
  commits:
  - 6da55852beb31922b3ac8dc94f98df57c744fba1
---

## Problem

The static-fetch path from [[REQ-21]] handles plain-HTML sites well but is structurally blind to:

- SPA shells where the body is `<div id="root"></div>` and content hydrates from JS.
- Computed CSS — declared values from `<style>` blocks miss anything resolved by cascade / inheritance / responsive media queries that didn't match the no-window static parser.
- **External-stylesheet `background-image: url(...)`** — the most common pattern for hero/banner backgrounds on real sites. Static parsing misses these because they live in `<link rel="stylesheet">` files.
- Above-the-fold visual signals — alignment, density, hero composition — that require seeing pixels, not DOM.
- The killer-demo screenshot strip that [[DOC-9]] §7.3 names as the visceral 0–2s reveal in the convert flow.

Browser Rendering — Cloudflare's `@cloudflare/puppeteer` binding — is the architecturally-aligned escalation per [[DOC-9]] §10.2: same Worker substrate, no new infra. This REQ wires it.

## Scope

Add the JS-rendered fetch path to `packages/extractor`. After this REQ:

- The escalation hook from [[REQ-21]] (`shouldEscalateToRendered`) makes a real decision based on body density.
- When escalation is triggered, the fetcher invokes Browser Rendering via `@cloudflare/puppeteer`, navigates, waits for hydration, captures three screenshots (mobile / tablet / desktop), and extracts computed CSS for the Layer A signals that the static path could not resolve — typography, palette, **and background-image URLs** for hero/section selectors.
- Computed background-image URLs that the static path missed are folded into [[REQ-21]]'s asset inventory as `kind: 'background'` records — the converted site can then reference them.
- Screenshots are uploaded to R2 ([[REQ-20]]'s `ASSETS_BUCKET` under a `references/` prefix) and the digest record's `screenshotKeys` are populated.
- The AI commentary pass becomes multimodal: the desktop screenshot is fed as image input to the Haiku 4.5 commentary call so the AI can comment on what it sees, not just signal bullet lists.
- All consumption goes through [[REQ-20]]'s safety layer: every request consumes from the Browser Rendering budget; budget exhaustion gracefully degrades to static-only with a typed `tool_result` note.

## Demo critical-path alignment

This REQ is on the convert-flow demo critical path. Per the 2026-06-18 planning chat, [[REQ-23]] / [[REQ-24]] (chat persistence) and [[REQ-27]] (Brief) are deferred — the future-alignment section at the bottom describes the eventual wire-up. For the demo, screenshots land in R2 but the digest record they're referenced from lives only for the page session via [[REQ-8]]'s in-memory chat handler. R2 cleanup is therefore manual until persistence lands (acceptable for demo).

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 2 (budget — already nailed in [[REQ-20]], restated here for scope clarity) and 6 (transcription confidence, partial — multimodal commentary):

- **Escalation heuristic**: escalate when the static fetch returns either (a) a `<body>` whose visible text length is under 200 characters, or (b) a document with `<script>` totalling > 80% of body byte count, or (c) the operator explicitly requests "render this page" (an `analyze_page` parameter `forceRendered: true`). All three conditions are tested in unit tests.
- **Screenshot viewports**: 390×844 (mobile portrait, iPhone 13 reference), 820×1180 (tablet, iPad Air reference), 1440×900 (desktop). PNG, full-page (long captures, not just above-the-fold), capped at 8 MB each — anything larger discards the screenshot for that viewport with a `screenshot_too_large` note.
- **Wait strategy**: `waitUntil: 'networkidle0'` with a 10-second timeout. If the page hasn't settled in 10 seconds, capture what's there. Each navigation counts toward the per-session 50-browser-second budget from [[REQ-20]].
- **Computed CSS extraction**: a small `getComputedStyle` script runs in the page after networkidle, returning:
  - For typography refinement: computed `font-family`, `font-size`, `font-weight` for `<body>`, `<h1>`, `<h2>`, `<h3>`.
  - For palette refinement: `background-color` for `<body>` and the largest above-the-fold element.
  - **For asset-inventory refinement** *(added per 2026-06-18 planning chat for the reproduce-the-site demo)*: computed `background-image` for `<body>`, `<header>`, every `<section>`, and every element identified as a hero candidate by the static-layer hero heuristic. Any resolved `url(...)` is emitted as an `AssetRecord` with `kind: 'background'` and merged into the digest's `signals.assetInventory` via `mergeComputedSignals`.
- **Multimodal AI commentary**: when a desktop screenshot is available, it is included as an image content block in the Haiku 4.5 commentary call alongside the digest body. Prompt explicitly asks the AI to comment on what's *seen* (alignment, density, imagery treatment) in addition to what's in the signal bullets.
- **R2 layout**: screenshots stored at `references/{chatId}/{turnId}/{viewport}.png`. Content-Type `image/png`. No per-asset TTL; cleanup is the same chat-deletion sweep [[DOC-9]] §3.3 names (or manual for the demo, pending [[REQ-23]]).
- **Budget-exhaustion behaviour**: when [[REQ-20]]'s budget middleware returns `budget_exhausted`, the fetcher falls back to the static path, marks the digest's `fetchPath: 'static'`, and appends a `whatsMissing` entry: "Visual signals unavailable — Browser Rendering budget exhausted for this session." No retry. No silent failure.

## Design conversation

Full thread: [[CHAT-13]]. Most relevant operator framing for this REQ:

> "The other very powerful on boarding experience might be something like this. I explained that I am a local plumber trying to create a new website for my new business. Our tool does a search for local plumber websites scans the top 3 to 5 and has a discussion with the user about what they like and dislike about these sites. This is interesting in this context we would want to use the right hand panel to display a completely different website. It's an eye frame though so that should be possible right?"
> — [[CHAT-13]] turn 2

The iframe answer landed at "iframe by default with screenshot fallback when blocked"; per [[CHAT-13]] turn 3 the operator then escalated to "actually I like the idea of screenshots for the user too" — so screenshots are the primary display surface, not the fallback. This REQ produces those screenshots.

> "For the aesthetic dialogue you describe (alignment, palette, centering), **the screenshot itself matters a lot** — fed to the model as a multimodal input, the AI can talk about design the way a human would."
> — assistant in [[CHAT-13]] turn 2, accepted by the operator's silence + advance

This is why the multimodal AI commentary pass is in scope here.

From the 2026-06-18 planning chat:

> "our goal is to be able to reproduce their site so it looks as identical as possible using our framework if there are gaps we need to understand what they are"

Drives the computed `background-image` extraction added here — without it, hero-background URLs declared in external stylesheets are invisible to the transcription and the converted site loses its key visual.

## IN

### `packages/extractor` additions

- `renderedFetch(url, ctx)` — invokes `BROWSER` binding (Cloudflare Browser Rendering) via `@cloudflare/puppeteer`. Navigates, waits, captures the three screenshots, extracts computed CSS (typography + palette + background-images), returns `{ html, computedStyles, computedBackgroundAssets, screenshots }`. Goes through [[REQ-20]]'s budget middleware.
- `shouldEscalateToRendered(staticResult)` — replaces the stub from [[REQ-21]]. Implements the escalation heuristic above. Returns `{ escalate: boolean, reason: string }`.
- `mergeComputedSignals(layerASignals, computedStyles, computedBackgroundAssets)` — refines the digest's typography + palette signals with computed-style data and **merges computed background-image URLs into the asset inventory**. Computed signals always win over declared signals when both exist; declared remain when computed is absent. New asset records from computed background-images dedup against existing inventory entries by absolute URL (incrementing `references`).
- `uploadScreenshots(screenshots, ctx, { chatId, turnId })` — uploads each viewport screenshot to R2 under `references/{chatId}/{turnId}/{viewport}.png` and returns the keys for the digest record. Uses the `ASSETS_BUCKET` binding from [[REQ-20]].

### AI commentary pass — multimodal upgrade

The commentary LLM call (Haiku 4.5) gains a conditional image content block:

```typescript
const content = screenshotKeys.desktop
  ? [
      { type: 'image', source: { type: 'r2_key', key: screenshotKeys.desktop } },
      { type: 'text', text: commentaryPrompt(digestBody) },
    ]
  : [{ type: 'text', text: commentaryPrompt(digestBody) }];
```

Prompt body is updated to explicitly ask for visual observations when an image is present and to flag the visual-signal absence when not.

### `apps/control-app` wiring

- `wrangler.toml` adds `[browser]` binding `BROWSER = "WEBSITE_BROWSER"` (top-level + `[env.production]`).
- The `analyze_page` tool dispatch from [[REQ-21]] is amended: after the static parse runs, `shouldEscalateToRendered` decides; if escalation fires, the rendered path runs and `mergeComputedSignals` produces the final signals (including the augmented asset inventory).
- The optional `forceRendered: boolean` parameter is added to the `analyze_page` AI tool input schema; documented in the tool description as "use only when the operator explicitly asks for a rendered analysis."

### Builder UI

- `<DigestReport>` from [[REQ-21]] (a [[REQ-13]] `<ChatCard>` variant) gains a screenshot strip (mobile / tablet / desktop) rendered from the R2 keys via `/assets/{key}` (the route [[REQ-20]] serves). The strip is the first element in the rendered report so the operator's first visual is the page itself.

### Test fixtures

Adds to the shared `tests/fixtures/convert-flow/` directory (created by [[REQ-21]]):

- `js-spa/` — `<div id="root"></div>` shell plus a JS bundle that hydrates with content matching the `plain-html-site/` content tree. Exercises the escalation heuristic and computed-CSS extraction.
- `external-stylesheet-bg/` — a static HTML page with an external stylesheet declaring `.hero { background-image: url('/hero-bg.jpg') }`. Static parsing misses the URL; computed-CSS extraction picks it up. Exercises the merge.

Browser Rendering invocation in tests uses Cloudflare's local emulator surface in Wrangler dev / Miniflare.

## OUT (explicitly deferred)

- Iframe-based live display surface — [[DOC-9]] §7.2 marks this as "secondary fallback"; not built in v1. The "click to open in new tab" affordance is sufficient.
- Per-element computed-style extraction beyond the listed selectors — keeps the in-page script small and the budget consumption low.
- Above-the-fold screenshot crops (in addition to full-page) — full-page suffices for the AI's multimodal input and for the operator's right-panel report.
- Pre-render JS execution against a custom user-agent (e.g. mobile UA string for the mobile viewport) — viewport size is the only mobile signal in v1.
- Browser pooling / warm-instance management — Cloudflare Browser Rendering handles this; we do not.
- Per-site cookie / login flows ("render this dashboard behind auth") — out of scope.
- **Asset download** — the augmented inventory still records URLs; downloads happen in [[REQ-28]] Stage 4.

## Dependencies

- [[REQ-20]] — safety contract + Browser Rendering budget middleware + `ASSETS_BUCKET` R2 binding.
- [[REQ-21]] — Reference Digest schema + the escalation hook this REQ replaces + the asset inventory this REQ augments.
- [[DOC-9]] §7.3 — progressive reveal pattern (mobile/tablet/desktop screenshots are the 0–2s element).

## Acceptance criteria

1. `shouldEscalateToRendered` returns `escalate: true, reason: "thin_body"` for a body with under 200 characters of visible text, and `escalate: false` for a body with rich text content.
2. `shouldEscalateToRendered` returns `escalate: true, reason: "js_dominant"` for a document where `<script>` content is over 80% of body bytes.
3. With `forceRendered: true` in the `analyze_page` input, escalation always fires regardless of heuristic.
4. `renderedFetch` against a known JS-rendered SPA (the `js-spa/` fixture) returns a hydrated `html` with > 1000 characters of visible text and computed styles for `<body>` and `<h1>`.
5. After a successful rendered fetch, the digest's `signals.typography.body.fontFamily` reflects the computed style, not `not_detected`.
6. **Computed background-image extraction**: against the `external-stylesheet-bg/` fixture, the merged digest's `signals.assetInventory` contains a record with `kind: 'background'` and `url: ".../hero-bg.jpg"` that the static parse did not produce. Dedup holds: if the same URL was already present from inline `style`, references increments rather than duplicating.
7. Three screenshots are uploaded to R2 at the expected key shape; the digest's `screenshotKeys` carries all three; each PNG is under 8 MB.
8. Calling `/assets/{screenshotKeys.desktop}` returns the screenshot bytes with `Content-Type: image/png`.
9. The AI commentary pass for a digest with an attached desktop screenshot includes at least one sentence referring to visual properties (alignment, density, treatment, layout) — verified by prompt-and-response pattern matching, not just length.
10. With Browser Rendering budget exhausted ([[REQ-20]] §Acceptance 9 condition), `analyze_page` returns a digest with `fetchPath: 'static'` and a `whatsMissing` entry citing the exhausted budget. The call succeeds; it does not return `ok: false`.
11. The builder `<DigestReport>` chat-card renders the screenshot strip at the top of the body; the screenshots are visible without scrolling within the card on a 1440-wide builder layout.
12. UAT: operator pastes the URL of a JS-rendered SPA → AI calls `analyze_page` → escalation fires → digest chat-card renders with all three screenshots, computed typography, and any computed background-image URLs visible in the inventory. Total wall-clock under 30 seconds.

---

## Future alignment: persistent chat infrastructure ([[REQ-23]] / [[REQ-24]])

[[REQ-23]] / [[REQ-24]] are deferred from the demo critical path; this section describes the integration once they land. **Not blocking for this REQ.**

- R2 screenshot keys will be referenced from the digest's `tool_calls_json` row in [[REQ-23]]'s `chat_messages` table.
- Chat-session deletion cascade will sweep the screenshots.
- No schema change here; integration is the existing `tool_result` payload reaching the `chat_messages` row through [[REQ-24]]'s `POST /api/chat` dispatcher.

## Story points

6. Browser Rendering binding + `renderedFetch` + escalation heuristic + computed-CSS extractor (typography + palette + background-image) + `mergeComputedSignals` (inventory merge included) + screenshot R2 upload + multimodal commentary upgrade + `<DigestReport>` screenshot-strip update + 2 fixtures. Unchanged from 6 — the background-image extraction is incremental on the existing selector script and inventory merge.