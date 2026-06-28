---
uid: bundle-24c4d23c
id: BUNDLE-4
type: bundle
title: REQ-22 + REQ-28 + BUG-1 + REQ-30 + REQ-31
created_by: xgd
created_at: '2026-06-27T02:20:43.482365+00:00'
updated_at: '2026-06-28T21:46:50.906281+00:00'
completed_at: '2026-06-28T21:46:50.906281+00:00'
last_field_updated: status
status: free_and_reconciled
fields:
  commits:
  - a71c82ac2fd8ea50a8ea8791c6199486352ad45f
  auto_merge_back: true
  priority: medium
  merged_at_commit: a71c82ac2fd8ea50a8ea8791c6199486352ad45f
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-22: Browser Rendering integration: JS-rendered fetch path with screenshots and computed-CSS signals

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



---

## Amendment 2026-06-24 — Render-by-default

Per design conversation with the operator on 2026-06-24, the escalation heuristic captured above is **inverted**: the rendered path is the default, static is the fallback.

### Why the flip

This product extracts brand DNA — typography, palette, layout, hero imagery — to reconstruct a customer site that matches the inspiration. Static HTML from a 2026-era marketing site is structurally devoid of that signal: React shells, externalised stylesheets, JS-composed hero sections. Defaulting to static and "escalating when needed" inverts cost and value — we routinely pay a cheap fetch to throw away the signal we came for, then scramble back to the rendered path via heuristics.

[[REQ-49]] is corroborating evidence: it added `maybeUpgradeStaticDigest` to `transcribe_site` precisely because cached static-only digests carried no screenshots, no computed styles, and no background-image assets — and the resulting transcription had nothing for the AI to visually anchor on. That workaround force-renders at transcribe time. The honest fix is to render at analyze time so every cached digest is already rendered.

### What changes

**Replaces** the "Escalation heuristic" decision in `Decisions already made`. New control flow:

1. The rendered fetch runs **first** in `analyze_page`. Same `BROWSER` binding, same screenshots, same computed-CSS extraction, same R2 upload — unchanged from this REQ's original implementation.
2. The static fetch becomes the **degraded fallback**, invoked only when:
   - The `BROWSER` binding is unavailable in this environment (test / local without binding), OR
   - The Browser Rendering budget from [[REQ-20]] is exhausted for the session, OR
   - The rendered driver throws.
   In each case, the digest's `fetchPath` is `'static'` and a `whatsMissing` note explains why visual signals are absent.
3. The function `shouldEscalateToRendered` is **removed** along with its heuristic constants (`THIN_BODY_TEXT_LIMIT`, `JS_DOMINANT_RATIO`). It was predicting "is rendering worth it?" — the answer is now unconditionally yes.
4. The `analyze_page` AI tool parameter `forceRendered` is **removed**. It is no longer meaningful when rendering is the default. The tool description is updated to: "Returns a rendered digest (screenshots + computed CSS) by default. Falls back to static-only when the Browser Rendering budget is exhausted; the digest then carries a whatsMissing entry explaining why visuals are unavailable."
5. [[REQ-49]]'s `maybeUpgradeStaticDigest` becomes a recovery path only — it still upgrades digests cached during a budget-exhausted window if the budget later refills, but is no longer the primary mechanism for getting visual signal into transcription.

### Acceptance criteria — replacements

**Removed** (the function and parameter they tested are gone):
- Original criterion 1 — `shouldEscalateToRendered → thin_body`.
- Original criterion 2 — `shouldEscalateToRendered → js_dominant`.
- Original criterion 3 — `forceRendered: true` always escalates.

**Added**:
- 13. `analyze_page` against the `plain-html-site/` fixture (a static-rich page that would previously have returned `fetchPath: 'static'`) now returns `fetchPath: 'rendered'` with all three screenshots populated.
- 14. `analyze_page` against the `js-spa/` fixture (unchanged) returns `fetchPath: 'rendered'` — the behaviour is the same as before, just no longer routed via a heuristic.

**Carried unchanged**:
- Criterion 10 (budget-exhaustion fallback) — still the only path that produces a static digest. Its `whatsMissing` note is now the user's primary signal that the rendered default did not run for this call.
- Criteria 4–9, 11, 12 — unchanged in intent; the rendered behaviour they test is now the default code path rather than the escalated one.

### Story points

Unchanged at 6. The amendment is a simplification — deleting the heuristic, the `forceRendered` parameter, and three tests — not an expansion.

### Tests to delete (drift cleanup)

- `tests/test_UAT_FC_REQ-22_escalation_thin_body.test.ts`
- `tests/test_UAT_FC_REQ-22_escalation_js_dominant.test.ts`
- `tests/test_UAT_FC_REQ-22_escalation_force_rendered.test.ts`

These test the removed function. New UATs added for criteria 13–14 cover the replacement behaviour.


---

## REQ-28: Site Transcription (Layer B): convert flow that maps a Reference Digest into module instances and theme tokens

## Problem

The convert flow is the pre-launch killer demo per [[DOC-9]] §2.1: operator pastes a URL → screenshot appears within 2 seconds → palette and type apply within 8 seconds → an editable themed draft populated with module instances appears within 60 seconds → operator AI is already conversing throughout. This REQ delivers Layer B — the LLM-driven step that maps a Reference Digest + rendered DOM + screenshots into 1st contact module instances and theme tokens, then mirrors every referenced visual asset into our R2 bucket so the converted site is self-contained.

This is **not** deterministic parsing. It is the AI mapping "this hero with centered headline + image-right" onto our `hero-split` module with specific theme tokens — mediated by [[DOC-7]]'s structured-edit discipline so the output must pass the same validator as any operator-driven edit. The output lands in the user's draft via the existing AI tool surface; from that moment the converted site is just a normal site the operator iterates on.

## Scope

Add the `transcribe_site` AI tool plus the progressive-reveal orchestration. After this REQ:

- An AI tool call `transcribe_site(digestId)` (where `digestId` references a digest produced by [[REQ-21]] / [[REQ-22]]) produces a draft set of theme tokens and module instances in the 1st contact schema, written into the current site draft via existing AI tool calls.
- The flow is staged so the operator sees output at 0–2s (screenshot), 2–8s (palette + type applied), 10–60s (module instances populated), and 60s+ (assets swapped from external URLs to R2-mirrored copies).
- Every transcribed output passes [[DOC-7]]'s framework-catalog validator before being committed.
- Each transcribed module carries a `confidence` field that the AI surfaces to the operator for low-confidence items.
- The flow includes a destructive-action confirmation: "this will replace your current draft" with explicit operator consent before the first overwrite.
- **All referenced visual assets** (`<img>` URLs, computed `background-image` URLs from [[REQ-22]], `<video>` URLs from [[REQ-21]]) used by the transcribed modules are downloaded into the platform's R2 bucket and the module AssetRefs are rewritten to R2 keys.

## Demo critical-path alignment

This REQ is the goal of the convert-flow demo (paste URL → reproduce site). Per the 2026-06-18 planning chat:

- [[REQ-23]] / [[REQ-24]] (chat persistence) deferred. `transcribe_site` runs through [[REQ-8]]'s in-memory chat handler. The destructive-confirmation flag lives on an in-memory chat metadata object scoped to the page session — it does not survive reload.
- [[REQ-27]] (Brief) deferred. The post-transcription Brief-update nudge described in the alignment section at the bottom of this REQ is dropped for the demo; the LLM transcription prompt simply omits the `propose_brief_update` hook.
- The demo's success bar is "operator pastes URL → sees screenshot → sees themed preview → sees transcribed modules → sees self-contained converted site (all assets in our R2) — in under 90 seconds total".

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 6 (transcription confidence), the destructive-import question from [[CHAT-13]] turn 2, and the asset-mirroring scope from the 2026-06-18 planning chat:

- **Destination of the converted site** ([[CHAT-13]] turn 2 question 1): the convert flow writes **directly into the operator's current draft**, with a single explicit confirmation modal before the first overwrite. The killer-demo wins; side-by-side import is not v1. Confirmation modal text: "Convert will replace your current draft with a transcription of {url}. This cannot be automatically undone. Continue?" Cancel exits the flow; confirm proceeds.
- **Confidence reporting** ([[DOC-9]] §13.6): the LLM is prompted to return a `confidence: 'high' | 'medium' | 'low'` per module instance and per theme-token group (`palette`, `typography`, `layout`). The AI's narrative after the transcription explicitly names the low-confidence items ("I matched the hero with high confidence but the testimonial block was unfamiliar — please verify the structure"). Never refuses the conversion outright — even at 100% low confidence, a draft is produced.
- **Module fallback policy**: when a section of the source page doesn't match any module in the framework catalog, the transcription produces a `text-block` module containing the rendered HTML's text content + a `confidence: 'low'` flag. The AI's narrative names this explicitly: "I couldn't match section X; I dropped its content into a text block — you may want to ask for a more specific module."
- **Theme token derivation**: palette role inference from the digest ([[REQ-21]]) maps directly to theme tokens: `background → tokens.surface`, `body → tokens.text`, `accent → tokens.accent`, `cta → tokens.action`. Typography: digest `primary_pair` body + heading → token `typography.body` and `typography.heading`. When digest signals are `not_detected`, the framework's default tokens remain.
- **Progressive reveal sequencing**: the tool dispatches four sequential AI tool batches: (1) `apply_screenshot_preview` (an ephemeral preview module that just shows the desktop screenshot, swapped out at step 3), (2) `set_theme_tokens` from the digest's signals, (3) `replace_modules` with the LLM-transcribed module instances, **(4) `mirror_assets_to_r2` — an async stage that downloads every referenced asset to R2 and rewrites AssetRefs** (see Asset-mirroring section below). The operator AI is free to converse between steps; the tool batches run on a Worker-managed orchestration so the chat isn't blocked.
- **LLM model + prompt**: model is Claude Opus 4.7 (the canonical builder model). Prompt receives: framework module catalog (per [[REQ-3]] / [[REQ-5]]), the Reference Digest body, the desktop screenshot as multimodal input, the rendered DOM extract from [[REQ-22]], and the asset inventory (so the LLM can choose which assets to reference per module). Output is a JSON object validated against the 1st contact schema; on validation failure the LLM is given the validator error and one retry. Two failures in a row produces a fallback "I couldn't transcribe this site automatically; here's a hero-only draft as a starting point." Never throws.
- **Idempotency**: `transcribe_site(digestId)` with the same digest produces the same theme tokens deterministically (no LLM in the token step). Module instances are LLM-driven so are non-deterministic; calling twice produces two different drafts, and the second call is gated behind the destructive confirmation again.
- **No transcription caching** ([[REQ-20]] cache policy): transcriptions are one-shot per draft and explicitly **not** cached. Repeating against the same URL re-runs Layer A and Layer B fresh.
- **Robots.txt and convert-the-operator's-own-site** ([[DOC-9]] §13.7): the operator-confirms-per-origin override from [[REQ-20]] is the mechanism. The convert flow's destructive-confirmation modal includes a checkbox "I own this site" that, when checked, also registers a robots override for the origin. UX is folded into the one modal.

### Asset-mirroring (Stage 4) decisions

Per the 2026-06-18 planning chat (operator framing: "our goal is to be able to reproduce their site so it looks as identical as possible using our framework if there are gaps we need to understand what they are"):

- **Scope**: every `AssetRecord` in the digest's `signals.assetInventory` (kinds `img`, `background`, `video` — all three populated by [[REQ-21]] and [[REQ-22]]) that is actually referenced by a module instance in the transcribed draft. Assets in the inventory that the LLM did not reference are not downloaded.
- **Dedup**: by absolute URL. Each unique URL is fetched once regardless of how many module instances reference it. This relies on two compounding layers — [[REQ-20]]'s per-URL KV response cache (1-hour TTL) handles transport-level dedup; this REQ's stage-4 walker also tracks a per-orchestration `Set<url>` so two simultaneous references in the same draft produce one R2 object. The R2 key is content-addressed (`sha256(url)`) so identical URLs always collapse onto the same key.
- **R2 key shape**: `sites/{siteId}/imports/{sha256(url):0..16}.{ext}` where `{ext}` is inferred from the response `Content-Type` (`image/png` → `png`, `image/jpeg` → `jpg`, `image/webp` → `webp`, `image/svg+xml` → `svg`, `image/gif` → `gif`, `video/mp4` → `mp4`, `video/webm` → `webm`). Unknown content-types fall back to `bin`. The R2 key is recorded back into the module's AssetRef.
- **Stage timing**: Stage 4 is **async after Stage 3**. Modules render with their original external URLs first (operator sees the converted site immediately), then each AssetRef swaps to its R2 key as the download completes. Each completed download emits a `transcribe_progress` SSE event with `{ stage: 4, status: 'asset_mirrored', url, r2Key }`.
- **Failure mode**: when a download fails (over [[REQ-20]]'s 5 MB body cap, 4xx/5xx response, robots.txt blocks the origin, SSRF reject, rate-limit exhausted) the AssetRef stays at the external URL. The failure is collected and surfaced in the post-transcription chat message as a "What couldn't mirror" sub-list: "3 assets remain referenced externally — couldn't mirror: {url1} (too large, 7.2 MB), {url2} (blocked by robots.txt), {url3} (timeout)." This is the explicit-gaps requirement from the operator's framing.
- **Safety**: every download goes through [[REQ-20]]'s `safeFetch` + rate-limit + intent-token middleware. The operator-intent-token minted at the top of the convert flow is the authorization basis; Stage 4 reuses the existing convert-flow token rather than minting new ones. (If the token has expired by the time Stage 4 runs — possible if Stage 3 takes a long time — Stage 4 mints a fresh asset-mirror token tied to the `transcribe_site` invocation.)
- **Concurrency**: Stage 4 fetches up to 4 assets in parallel from the orchestration Worker, bounded by [[REQ-20]]'s per-account rate limits (burst limit of 10/60s is the ceiling).
- **Cleanup on transcription-failure**: if the orchestration fails before Stage 4 completes, partial R2 writes are not rolled back — the operator can re-run convert and the SHA-keyed dedup means a successful retry overwrites the same keys.

## Design conversation

Full thread: [[CHAT-13]]. Most relevant operator framing for this REQ:

> "It would be for a very powerful demonstration to be able to point to an existing site suck in all the style content and assets and then allow for an interactive discussion with the AI and make changes to the site in real time. That sounds like a killer demo."
> — [[CHAT-13]] turn 2

> "I think the convert existing site is sufficiently important use case that we are going to need it before launch."
> — [[CHAT-13]] turn 2

> "The recreate my website in your framework game. Would require probably much more detailed information about the site but both could start from the same place and just use different kinds of summarization and digesting"
> — [[CHAT-13]] turn 3

From the 2026-06-18 planning chat:

> "Just <img src>, or also CSS background-image: url(...) and <video src>? <-- our goal is to be able to reproduce their site so it looks as identical as possible using our framework if there are gaps we need to understand what they are"

Settled: all three kinds. Failures surfaced explicitly. Stage 4 added.

> "it would actually be nice if the web tool understood the URL connection and only download a URL once"

Settled: SHA-256-keyed dedup at the R2-key level, plus per-orchestration `Set<url>` to avoid in-flight duplication. [[REQ-20]]'s per-URL KV cache provides the transport-level layer.

> "Stage 4 after the LLM transcription (the screenshot-then-tokens-then-modules sequence completes, then async asset download fills in) — agree with your suggestion"

Settled: Stage 4 is async post-transcription. Modules render with external URLs first; AssetRefs swap as downloads land.

## IN

### `packages/extractor` additions

- `deriveThemeTokens(digest)` — deterministic mapping from digest palette / typography / layout signals to a theme-token patch. Pure function. Output validates against [[REQ-4]]'s theme-token schema.
- `composePromptForTranscription(digest, catalog, screenshotKey)` — assembles the multimodal Opus prompt. Includes the asset inventory so the LLM knows which URLs to reference per module.
- `validateTranscription(transcription, catalog)` — runs the transcribed module instances through [[REQ-3]]'s validator. Returns `{ ok: true } | { ok: false, errors: [...] }`.
- `collectReferencedAssetUrls(transcription)` — walks the transcribed module instances and returns the deduped set of URLs that appear in any AssetRef. The input to Stage 4.
- `mirrorAssetToR2(url, { siteId, ctx })` — single-asset download path. `safeFetch` the URL through [[REQ-20]]'s middleware, infer content-type, write to `ASSETS_BUCKET` at the SHA-keyed path, return `{ ok: true, r2Key } | { ok: false, reason }`.
- `rewriteAssetRefs(transcription, urlToR2Key)` — pure-function pass that swaps every AssetRef matching a key in the map. URLs not in the map remain at their external value.

### AI tool: `transcribe_site`

Added to the operator AI's tool surface:

```
input: { digestId: string }
output: { ok: true, draftCommitted: true, assetMirrorSummary: { mirrored: number, failed: number, failures: [{url, reason}] } }
       | { ok: false, error: typed-error }
```

Implementation flow:

1. Fetch the digest record from the chat history. If not found, return `digest_not_found`.
2. Check the destructive-confirmation flag on the chat metadata (`convertConfirmed[chatId] === true`). If not set, return `requires_confirmation` with the confirmation prompt text; the AI surfaces a `ConvertConfirmation` `tool_result` of `kind: "convert_confirmation"` (rendered via [[REQ-13]]'s `<ChatCard>` pattern by `<ConvertConfirmation>`); operator clicks Confirm → flag is set → the AI re-invokes `transcribe_site`.
3. Stage 1 — `apply_screenshot_preview`: write an ephemeral preview module to the draft showing the desktop screenshot.
4. Stage 2 — `deriveThemeTokens(digest)` → apply theme tokens to the draft via existing tool surface.
5. Stage 3 — LLM transcription: invoke Opus 4.7 with the composed prompt. Validate output. On validation failure, retry once with validator errors fed back. On second failure, fall back to the hero-only draft.
6. Replace the ephemeral preview module + the rest of the draft with the transcribed module list.
7. Stage 4 — `mirror_assets_to_r2` (async, non-blocking on the chat response):
   - `collectReferencedAssetUrls(transcription)` → deduped URL set.
   - For each URL (up to 4 in parallel, bounded by [[REQ-20]] rate limits): `mirrorAssetToR2(url, { siteId, ctx })`.
   - Build the `urlToR2Key` map from successful downloads; collect failures.
   - `rewriteAssetRefs(currentDraft, urlToR2Key)` — atomic-replace the draft's module list to swap AssetRefs to R2 keys.
   - Each successful mirror emits a `transcribe_progress` SSE event with `{ stage: 4, status: 'asset_mirrored', url, r2Key }`.
   - Each failure emits `{ stage: 4, status: 'asset_failed', url, reason }`.
   - When Stage 4 completes, emit a final summary chat message with the mirroring summary (counts + per-failure reason list).

### Builder UI

- `<ConvertConfirmation>` chat-card variant (registered with [[REQ-13]]'s dispatcher under `kind: "convert_confirmation"`). Uses the `<ChatCard>` primitive with `tone: 'warning'`, header "Convert site", body containing the confirmation text + "I own this site" checkbox, actions row containing Confirm / Cancel buttons.
- `<TranscribeProgress>` chat-card variant (registered under `kind: "transcribe_progress"`). Uses `<ChatCard>` with `tone: 'info'`, header "Converting {url}", body containing a 4-row progress list (Screenshot / Theme / Modules / Assets mirrored: N/M). Updates in place as SSE events arrive.
- Progressive-reveal staging: the preview panel renders each stage as it lands (per existing iframe preview model from [[DOC-8]]). The screenshot stage is just an image module; theme-token stage flips CSS variables in the preview; module-instance stage re-renders the module list; **asset-mirror stage swaps `<img>` / background-image / `<video>` sources from external URLs to `/assets/{r2Key}` URLs as each download completes — operator sees external content load first, then swap to R2-served content**.

### Worker-managed orchestration

- The four stages run as a single async orchestration in the control-app Worker (not as four separate AI turns) so the operator AI can converse while transcription proceeds. The orchestration uses [[REQ-9]]'s SSE event registry to stream stage-completion events to the builder.
- Each stage emits a `transcribe_progress` SSE event with `{ stage: 1|2|3|4, status: 'started'|'completed'|'failed'|'asset_mirrored'|'asset_failed', details }`. The `<TranscribeProgress>` chat-card consumes these.
- Stage 4 runs in the background after the `transcribe_site` tool call returns success; the chat-side summary message is appended once Stage 4 wraps.

### Confidence surfacing

- The chat note after a successful transcription is structured: `{ summary, lowConfidenceItems: [{section, reason}], assetMirrorSummary }`. Rendered as a list with "Verify or replace" affordances that emit pre-filled chat messages on click.
- The asset-mirror sub-summary follows the same shape: "Mirrored {N} of {M} assets. Couldn't mirror: {failures rendered as a list with reasons}".

### Test fixtures

Adds to the shared `tests/fixtures/convert-flow/` directory (created by [[REQ-21]], extended by [[REQ-22]]):

- `assets-heavy/` — static HTML page with 8 `<img>` URLs across 4 module candidates, 2 inline `background-image` URLs, 1 `<video>`, and 1 over-5MB image (triggers the size-cap failure path). Exercises Stage 4 end-to-end with mixed success/failure.
- `duplicate-asset/` — page where the same `/hero.jpg` URL is referenced by an `<img>` in the hero and a `background-image` in a different section. Exercises the dedup path: one R2 object, two module AssetRefs pointing to the same key.

All Stage 4 tests run against the Miniflare R2 emulator + the static-HTML fixture server pattern established in [[REQ-21]]'s test plan.

## OUT (explicitly deferred)

- Side-by-side import workspace — destructive direct overwrite is v1 per Decisions.
- Per-module manual replacement UI — operator iterates via the existing AI tool surface (asking for a specific module change).
- Multiple URL transcription in one shot ("clone these three pages") — single URL only in v1.
- Domain-aware customizations (e.g. "recognize plumbing-trade conventions") — pure framework-catalog matching in v1.
- Confidence re-derivation as the operator edits — confidence is a snapshot from the transcription moment, not a live property.
- **Asset proxying via the `analyze_page` cache** — Stage 4 always re-fetches via `safeFetch` because the per-URL response cache from [[REQ-20]] has a 1-hour TTL that the convert flow may already have busted by the time Stage 4 runs. Belt-and-braces, with the SHA-keyed R2 layer providing the durable dedup.
- **Stylesheets, fonts, scripts** — we do not mirror these. The framework supplies its own CSS, typography, and JS. Only visual asset content (images, background images, video) is mirrored.

## Dependencies

- [[REQ-3]] — site-schema + validator (every transcription output must validate).
- [[REQ-4]] — theme tokens (token derivation maps into this).
- [[REQ-5]] — content modules + chrome (the catalog the transcription targets).
- [[REQ-9]] — Operator API + SSE registry (progressive-reveal events).
- [[REQ-13]] — `<ChatCard>` primitive + tool_result dispatcher (`<ConvertConfirmation>` and `<TranscribeProgress>` consume both).
- [[REQ-20]] — safety contract + `ASSETS_BUCKET` R2 binding + robots-override mechanism the destructive modal hooks.
- [[REQ-21]] — Reference Digest schema + asset inventory (Stage 4 walks this).
- [[REQ-22]] — Browser Rendering (the screenshot + computed signals + augmented inventory this REQ leans on).
- [[DOC-7]] §6.2 — allowed-edits list; the transcribed output uses the same tool surface.
- [[DOC-8]] §6 — four-layer validation gate.
- [[DOC-9]] §6.2, §7.3 — Layer B transcription, progressive-reveal latency targets.

## Acceptance criteria

1. `transcribe_site(digestId)` on a digest the chat metadata has not confirmed: returns `requires_confirmation`; no draft mutation occurs; chat shows the `<ConvertConfirmation>` chat-card (rendered via [[REQ-13]]'s dispatcher).
2. Operator clicks Confirm: chat metadata gains `convertConfirmed[chatId] = true`; the AI re-invokes `transcribe_site`; transcription proceeds.
3. Stage 1 fires within 2 seconds of confirmation: the preview iframe renders the desktop screenshot full-bleed. Verified by a `transcribe_progress` SSE event with `stage: 1, status: completed`.
4. Stage 2 fires within 8 seconds of confirmation: theme tokens are applied to the draft; the preview iframe's body / accent / heading CSS variables match the digest's palette and typography signals.
5. Stage 3 fires within 60 seconds of confirmation: the draft's module list is replaced with the LLM-transcribed instances. The preview re-renders with the new modules.
6. **Stage 4 starts within 1 second of Stage 3 completion** and runs async. The `transcribe_site` tool call returns success before Stage 4 finishes; the chat shows a `<TranscribeProgress>` card that updates as each asset mirrors.
7. **Stage 4 dedup**: against the `duplicate-asset/` fixture, the same URL referenced by two module instances produces exactly one `safeFetch` call and one R2 object; both AssetRefs end up pointing to the same R2 key.
8. **Stage 4 failure surface**: against the `assets-heavy/` fixture (which includes a deliberate over-5MB asset), the orchestration completes successfully; the over-size asset's AssetRef remains at its external URL; the post-transcription chat message enumerates the failure with reason `body_too_large`.
9. **Stage 4 covers all three asset kinds**: against the `assets-heavy/` fixture, `<img>`, `background-image`, and `<video>` URLs each end up at `sites/{siteId}/imports/{sha256(url):16}.{ext}` keys with the correct extension inferred from response Content-Type.
10. Every transcribed module instance passes [[REQ-3]]'s validator before being written; a validation failure triggers exactly one Opus retry with errors fed back.
11. After two validation failures, the fallback hero-only draft lands; the chat note explicitly names "I couldn't transcribe this site automatically; here's a hero-only draft."
12. Each module in the transcribed list carries a `confidence` field; the post-transcription chat note enumerates low-confidence modules with their sections.
13. `deriveThemeTokens(digest)` for a digest with `not_detected` palette and typography returns the framework default theme tokens unchanged; the transcription still proceeds with module instances derived from layout / content signals.
14. The "I own this site" checkbox on the `<ConvertConfirmation>` chat-card, when checked at Confirm, also registers a `robotsOverrides` entry for the origin in the chat metadata.
15. Re-invoking `transcribe_site` on the same digest in the same chat (without a destructive-confirmation reset) returns `requires_confirmation` again; one-shot confirmation does not blanket-authorize repeats.
16. UAT — full killer-demo: operator pastes URL → digest produced ([[REQ-21]] / [[REQ-22]]) → confirms convert modal → screenshot appears at 0–2s → palette + type apply at 2–8s → module list populates at 10–60s → assets mirror to R2 in the background → operator asks "make the hero darker" and the AI responds in the same chat without flow interruption. The converted site's `<img>` / `background-image` / `<video>` sources all resolve to `/assets/{r2Key}` URLs after Stage 4 completes (verified by inspecting the rendered preview's `src` attributes).

## Story points

12. Token derivation + transcription prompt + validation + 4-stage orchestration + Stage 4 download/dedup/rewrite loop + `<ConvertConfirmation>` and `<TranscribeProgress>` chat-card variants + confidence surfacing + 2 new test fixtures. (Was 9 before Stage 4 was added per the 2026-06-18 planning chat.)

---

## Future alignment: persistent chat infrastructure ([[REQ-23]] / [[REQ-24]] / [[REQ-27]])

[[REQ-23]] / [[REQ-24]] / [[REQ-27]] are deferred from the demo critical path; this section describes the integration once they land. **Not blocking for this REQ.**

- **Destructive-confirmation flag persistence**: the `convertConfirmed[chatId]` flag will live on the `chat_sessions` row in [[REQ-23]]'s schema (a JSON `metadata` column on `chat_sessions`, also used by [[REQ-20]]'s per-chat `robotsOverrides`). This means a confirmation will persist across reloads of the same session. For the demo, the flag lives in memory and a reload re-prompts.
- **Progressive-reveal SSE events** ([[REQ-9]]'s `transcribe_progress`): chat-side, each stage's completion will also append as a `system` role message to `chat_messages` (per [[REQ-23]] role enum) so the staged narrative is visible in scrollback and reachable via [[REQ-24]]'s `search_transcripts` later. The SSE event will be the live update; the `chat_messages` row will be the durable record. For the demo, only the live SSE → `<TranscribeProgress>` card exists.
- **Brief integration**: after successful transcription, the AI will be prompted to call `propose_brief_update` (from [[REQ-27]]) for `Project context`, `Palette`, `Typography`, and `References` sections so the converted site's Brief reflects what was imported. For the demo, this hook is dropped — the transcription prompt omits the `propose_brief_update` nudge.

When these REQs land, the runtime path described above is wired up via a small follow-on refactor (no schema change here).


---

## Implementation status (2026-06-18)

Free-coded to `xgd-working` across five `[FREE-CODED]` commits.

**Commits**:

1. `56ea818` — `packages/extractor/transcribe.ts`: pure-function transcription
   primitives (`deriveThemeTokens`, `composePromptForTranscription`,
   `validateTranscription`, `collectReferencedAssetUrls`, `rewriteAssetRefs`,
   `buildHeroOnlyFallback`, `parseTranscriptionFromLlm`). Adds
   `@1stcontact/framework/module-validate` subpath export so the validator can
   be imported without dragging in Astro components.
2. `0f74d82` — `packages/extractor/mirror-asset.ts`: `mirrorAssetToR2`,
   `mirrorAssetBatchToR2`, content-type → extension classifier, content-hashed
   R2 key generator. SHA-keyed dedup at the key level guarantees idempotence.
3. `4daad44` — `apps/control-app/src/operator/transcribe-site.ts`: the
   `transcribe_site` + `confirm_convert` operator actions with the 4-stage
   orchestration; `apps/control-app/src/operator/chat-metadata.ts`
   in-memory per-chat metadata store for the destructive-confirmation flag
   and per-origin robots overrides (AC14).
4. `0f6d904` — `packages/builder-ui/src/components/convert-confirmation.ts`
   and `transcribe-progress.ts`: the two REQ-13-dispatcher-mounted chat-card
   variants. ConvertConfirmation dispatches `fc:convert-confirmed` /
   `fc:convert-cancelled`; TranscribeProgress exposes `applyTranscribeEvent`
   so the SSE driver can push updates into the active card without re-render.
5. `7360670` — `tests/fixtures/convert-flow/assets-heavy/` and
   `duplicate-asset/` + the killer-demo end-to-end UAT verifying AC16.

**Deviations from the spec body, noted for reconcile**:

- **Digest lookup source**: AC text refers to "fetch the digest record from
  the chat history". REQ-23 / REQ-24 (persistent chat sessions) are deferred,
  so the action reads the digest from the existing `FETCH_CACHE_KV` digest
  cache (24h TTL, written by `analyze_page` per REQ-21). The lookup key is
  `digest:{sha256(url|SCHEMA)}`. When chat persistence lands the action will
  switch to the chat history; the lookup-by-URL contract is identical.
- **In-memory chat metadata**: the destructive-confirmation flag and per-origin
  robots overrides live in the module-singleton `chat-metadata.ts`, keyed by
  `(accountId, sessionId)`. Survives within a Worker isolate's lifetime; does
  NOT survive isolate eviction or browser reload. Explicit demo trade-off
  documented in the §Demo critical-path alignment section.
- **Stage 4 sync-await**: stages 1–4 currently run sync-await inside the
  action handler (rather than returning at stage 3 and continuing stage 4 in a
  background task). This keeps the test surface deterministic and matches the
  Cloudflare Workers execution model (no detached promises). The SSE events
  for stage 4 still emit per-asset as they complete, so the
  `<TranscribeProgress>` UX is identical. AC6's "Stage 4 starts within 1
  second of Stage 3 completion" is trivially satisfied because stage 4 starts
  immediately after stage 3 in the same call.
- **Hero-only fallback when Site validation fails**: there is a defense-in-depth
  fallback that runs the hero-only draft if the LLM-validated transcription
  somehow fails the full Site schema gate. In practice this should never
  fire because `validateTranscription` is a superset of the Site gate for
  module instances, but it's there to prevent invalid state shipping to the
  client.

**Test coverage**: 38 new UATs land in this REQ:
- `test_UAT_FC_REQ-28_derive_theme_tokens_from_digest` (6)
- `test_UAT_FC_REQ-28_validate_transcription_against_catalog` (8)
- `test_UAT_FC_REQ-28_compose_prompt_for_transcription` (3)
- `test_UAT_FC_REQ-28_collect_and_rewrite_asset_refs` (4)
- `test_UAT_FC_REQ-28_parse_llm_and_fallback` (7)
- `test_UAT_FC_REQ-28_mirror_asset_to_r2` (13)
- `test_UAT_FC_REQ-28_transcribe_site_requires_confirmation` (6)
- `test_UAT_FC_REQ-28_transcribe_site_stages` (7)
- `test_UAT_FC_REQ-28_transcribe_site_stage4_assets` (4)
- `test_UAT_FC_REQ-28_convert_confirmation_card` (4)
- `test_UAT_FC_REQ-28_transcribe_progress_card` (6)
- `test_UAT_FC_REQ-28_fixtures_assets_heavy_dedup` (2)
- `test_UAT_FC_REQ-28_killer_demo_end_to_end` (2)

Full vitest run: 298 tests pass across 138 files.


---

## BUG-1: Builder chat: editor invisible, send button mis-positioned (CSS not updated for TipTap migration)

## Symptom

In the builder UI (`/builder`), the chat panel renders the message list and a Send button only — there is no visible text-entry field. The Send button sits on the far left where the input should be (or fills space the input should occupy), instead of the intended `[ editor ][ Send ]` row.

## Root cause

REQ-13 (`8628a0a feat(chat): AI state visibility + chat markdown + ChatCard primitive`) migrated the chat input from a plain `<textarea class="fc-chat__textarea">` to a TipTap editor rendered into `<div class="fc-chat__editor">` with the editable content carrying class `fc-chat__editor-content`.

The CSS in `apps/control-app/public/builder.html` was not updated. It still styles `.fc-chat__textarea` — which no longer exists in the DOM — and has no rules for `.fc-chat__editor` or `.fc-chat__editor-content`. Result:

- `.fc-chat__editor` has no width / min-height / `flex: 1 1 auto`, so the editor wrapper collapses to its content's intrinsic size (effectively zero when empty).
- With no flex-grow on the editor, the Send button absorbs the row width and visually sits on the wrong side of the input.
- The TipTap content area has no background / border / padding / colour rules, so even when there is text it is invisible against the dark chat background.

## Fix

Update the CSS in `apps/control-app/public/builder.html`:

- Replace the stale `.fc-chat__textarea` rule with `.fc-chat__editor` (flex-grow, min-height, border, background) and `.fc-chat__editor-content` (text colour, padding, outline-on-focus).
- Keep `.fc-chat__input` as a flex row with `[ editor ][ send ]` order; ensure the editor takes available space and the Send button stays compact on the right.

No JS changes required — the DOM order in `chat-panel.ts` (editor first, then send) is already correct.

## Test plan

UAT: `test_UAT_FC_BUG-1_chat_input_visible_and_positioned` — render the builder SPA, assert:
1. The `[data-fc-chat-input]` editor element is present and has non-zero rendered width and height.
2. The `[data-fc-chat-send]` button sits to the right of the editor in the flex row (e.g. via `getBoundingClientRect().left` comparison).
3. Typing into the editor and clicking Send (or Cmd/Ctrl+Enter) triggers the `onSend` callback with the typed text.

Regression scope: `packages/builder-ui/` chat-panel tests + any CSS smoke tests in `apps/control-app/`.


---

## REQ-30: Convert flow rework: mechanical transcribe_site + R2 digest + page-CRUD tools + LLM how-to doc

## Problem

The killer-demo convert flow ([[REQ-28]]) ships, but live-running it against a real source (`https://joyfulculinarycreations.com/`) produces an underwhelming result: the output looks like the 1stcontact demo site with some of the source's text pasted into a hero, single page only (source has 4), no source images, original 1stcontact fonts and palette.

Diagnosis (2026-06-19 session):

1. **`transcribe_site` synthesises a site internally and the chat dispatcher discards it.** `packages/extractor/src/transcribe.ts:185-254` invokes Opus to produce module instances + a synthesized `Site`, the handler returns it in the action payload, and `apps/control-app/src/chat.ts:264-327` (the `system_action` branch) never applies the payload to `workingSite`. Only `state_edit` handlers update the draft.
2. **The chat AI is not driven to construct the site.** The system prompt (`apps/control-app/src/chat.ts:453-488`) does not mention `transcribe_site` outputs, does not reference R2-mirrored asset keys, and gives no guidance on the post-transcribe workflow.
3. **The AI lacks page CRUD.** `add_page`, `remove_page`, `reorder_pages` were specced in [[REQ-14]] but never implemented. Multi-page reproduction is impossible.
4. **The AI has no clean way to read the digest.** The structured signals exist (assetInventory, themeTokens, extractedContent) but only as fields on an action-payload object that's surfaced once and not retrievable later in the chat.

The root architectural confusion is that `transcribe_site` is doing both the **mechanical** layer (download, screenshot, mirror, extract) and a **synthesis** layer (LLM emits module instances), and the latter is wasted because it's neither applied to the draft nor exposed as actionable guidance to the chat AI.

The fix per the 2026-06-19 design conversation:

- `transcribe_site` becomes purely mechanical. The chat AI is the synthesizer.
- The digest is written to R2 alongside mirrored assets; the AI reads it from there like any other artifact, not via a special return-payload route.
- A static LLM-context doc (`docs/llm-context/reproducing-a-website.md`) explains the workflow once; the chat system prompt references it rather than concatenating per-turn instructions.

## Scope

Rework the convert flow so the chat AI actually reconstructs a recognizable copy of the source.

After this REQ:

- An operator pasting a URL in the builder runs `transcribe_site` → digest JSON + assets land in R2 → the AI reads the digest and constructs a multi-page site using its `state_edit` tools (`set_theme_token`, `add_page`, `add_module`, `set_module_content`, …) with images referencing the R2-mirrored copies.
- The demo against `joyfulculinarycreations.com` produces a draft that: (a) has 4 pages (or however many the source sitemap surfaced) — not one; (b) uses the source's palette and typography in its theme tokens — not the 1stcontact defaults; (c) references source images via R2 keys — not bare external URLs and not stock 1stcontact assets; (d) carries source text content in module fields.

## Decisions (closed 2026-06-19)

- **Digest destination: R2, not return payload.** `transcribe_site` writes a `TranscriptionDigest` JSON object to `sites/{siteId}/transcription/digest.json` and returns only `{ digestKey, summary: { pageCount, assetCount, mirrored, mirrorFailures } }`. No site object in the response.
- **Synthesis lives in the chat loop, not the handler.** Drop the internal Opus call in `composePromptForTranscription` / `buildSiteFromTranscription`. The chat AI does construction via existing `state_edit` tools plus the new page-CRUD tools.
- **AI reads the digest via a tool, not a payload field.** New `read_transcription_digest({siteId})` tool fetches the JSON from R2 and returns it. AI calls it after `transcribe_site` succeeds.
- **Workflow guidance is a static doc, not prompt-stuffing.** `docs/llm-context/reproducing-a-website.md` explains the workflow once. The chat system prompt loads/references it (mechanism: append the doc's contents to the system prompt at chat-loop init; reload not required per-turn).
- **Page CRUD lands here, not waiting for [[REQ-14]].** REQ-30 implements `add_page`, `remove_page`, `reorder_pages` because they're required for the multi-page demo. REQ-14 stays open for nav-editing tools (`set_nav_pattern`, `set_nav_entries`) and `duplicate_module` only; its page-management section is marked complete by REQ-30.
- **Multi-page plan source.** The digest's `perPagePlan` is derived from the home digest's internal nav links: any same-origin URL appearing in `signals.content.navLinks` that is already cached in `FETCH_CACHE_KV` becomes an additional `perPagePlan` entry. The home URL is always the first entry. If the AI wants a page that isn't yet cached, it calls `analyze_page` for it and re-invokes `transcribe_site`. (No standalone sitemap discoverer; that stays under [[REQ-21]] / [[REQ-22]] for future work.) Each entry carries `{ url, slug, title, screenshotKey, extractedContent[], suggestedModuleTypes[] }`. `suggestedModuleTypes` is a heuristic hint computed deterministically from layout signals — no LLM.
- **Asset inventory carries R2 keys.** Inventory entries are `{ sourceUrl, r2Key, kind: 'img'|'background'|'video', altText?, dimensions? }`. The AI is told to use `r2Key` (rendered as `/assets/{r2Key}`) in `set_module_content` calls.
- **Theme tokens stay deterministic.** `deriveThemeTokens(digest)` is unchanged (from [[REQ-28]]). The digest carries the derived tokens; the AI applies them via `set_theme_token`.
- **Confirmation flow unchanged.** The destructive-confirmation modal from [[REQ-28]] AC1-2 remains. `transcribe_site` still returns `requires_confirmation` until the operator confirms.
- **No structured "plan" doc returned to AI.** The digest is the only thing the AI reads. Workflow knowledge comes from the static `reproducing-a-website.md` doc.
- **LLM calls are mocked in automated tests.** No real Anthropic API calls in CI. The killer-demo UAT (AC9) and multi-page UAT (AC10) drive a stubbed chat loop with a scripted tool-call sequence (the same `setAnthropicSequence` pattern REQ-28's helpers already use). End-to-end validation against real Claude is a manual smoke test, not a gated test. Reason: cost + flakiness + non-determinism.
- **System-prompt wiring uses a constant import.** The how-to doc is imported into `apps/control-app/src/chat.ts` as raw text (Vite/esbuild `?raw` query, or equivalent inline-text mechanism) and appended to the system prompt at chat-loop init. No R2/static-asset round trip per turn. Reason: simpler bundling, no per-turn cost.
- **`perPagePlan` cardinality is unbounded.** The code never enforces a maximum number of pages. The multi-page fixture has 3 pages purely as test data — the production system supports N pages limited only by chat context window (emergent, not enforced).

## IN

### `packages/extractor` changes

- **New type** `TranscriptionDigest` (alongside existing digest types from [[REQ-21]]):
  ```ts
  type TranscriptionDigest = {
    siteId: string;
    sourceUrl: string;
    capturedAt: string;
    themeTokens: ThemeTokenPatch;          // existing shape from deriveThemeTokens
    perPagePlan: Array<{
      url: string;
      slug: string;                         // 1stcontact-valid slug derived from URL path
      title: string;                        // <title> or H1 from extracted content
      screenshotKey: string;                // R2 key of the desktop screenshot (may be empty if not captured)
      extractedContent: ExtractedBlock[];   // headings, paragraphs, list items, form fields
      suggestedModuleTypes: string[];       // ordered heuristic hints from layout signals
    }>;
    assetInventory: Array<{
      sourceUrl: string;
      r2Key: string;
      kind: 'img' | 'background' | 'video';
      altText?: string;
      dimensions?: { width: number; height: number };
    }>;
    mirrorSummary: { mirrored: number; failed: number; failures: Array<{url: string; reason: string}> };
  };
  ```
- **Drop** `composePromptForTranscription`, `buildSiteFromTranscription`, `validateTranscription`, `parseTranscriptionFromLlm`, `buildHeroOnlyFallback` from `packages/extractor/src/transcribe.ts`. These were the Opus-synthesis path. Keep `deriveThemeTokens`, `collectReferencedAssetUrls`, `rewriteAssetRefs` — still used.
- **New** `buildTranscriptionDigest(args)` — pure function that assembles a `TranscriptionDigest` from a home `ReferenceDigest`, a list of additional cached `ReferenceDigest`s for nav-discovered pages, the mirror result, and the siteId.
- **New** `extractPageContent(digest)` → `ExtractedBlock[]` — deterministic projection of headings, paragraphs (from `signals.content`), nav links, form fields.
- **New** `inferSuggestedModuleTypes(digest)` → `string[]` — pure heuristic. Forms present → `contactForm`. Hero detected → `hero` at top. Multiple nav links → `header` first. List groups → `text-block`. Footer always last. No LLM.

### `apps/control-app` changes

- **`transcribe-site.ts` reshape** (`apps/control-app/src/operator/transcribe-site.ts`):
  - Drop Stage 3 LLM synthesis (the Opus call that produces module instances).
  - Stages become: Stage 1 = screenshot emit (home page); Stage 2 = mirror assets inline (uses union of all referenced URLs across all per-page digests); Stage 3 = build `TranscriptionDigest` with r2Keys and write to R2 at `sites/{siteId}/transcription/digest.json`.
  - Discover additional pages by reading the home digest's `signals.content.navLinks`, resolving same-origin URLs, looking each up in `FETCH_CACHE_KV`. Each cache hit becomes an extra `perPagePlan` entry.
  - Return payload becomes `{ kind: 'transcribe_site_done', digestKey: string, summary: { pageCount, assetCount, mirrored, mirrorFailures } }`. Drop the `site`, `modules`, `themeTokens`, `narrative` fields from the payload — these all live in the digest.
- **New action** `read_transcription_digest` (category: `system_action`):
  - Registered in `apps/control-app/src/operator/registry.ts`.
  - Implementation in `apps/control-app/src/operator/read-transcription-digest.ts`.
  - Input: `{ siteId: string }`.
  - Reads `sites/{siteId}/transcription/digest.json` from `ASSETS_BUCKET`. Returns the parsed JSON.
  - Error mode: `{ status: 'failed', error: 'digest_not_found' }` when the key is missing.
- **New state-edit actions** for page CRUD (per [[REQ-14]] §Page management, implemented here in `packages/builder-ui/src/tools.ts`):
  - `add_page` — input `{ slug, title, after_slug? }`. Inserts a new page with empty modules and default seoMeta. Validates slug format (`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`), uniqueness, and that `after_slug` exists if provided.
  - `remove_page` — input `{ slug }`. Removes the page. Validates: page exists; site retains ≥1 page; nav entries pointing at it are stripped atomically.
  - `reorder_pages` — input `{ slugs: string[] }`. Reorders. Validates: list contains every page slug exactly once.
  - All three follow the registry conventions from [[REQ-9]] / [[REQ-14]] (system_prompt_card, schema, validator hook through [[REQ-3]]).
- **Chat system prompt** (`apps/control-app/src/chat.ts`'s `buildSystemPrompt`):
  - Append the contents of `docs/llm-context/reproducing-a-website.md` to the system prompt via constant import (`?raw` or inline-text bundling). The doc bytes ship with the worker; no runtime fetch.

### `docs/llm-context/reproducing-a-website.md` (new)

Markdown document, AI-facing, sections:

1. **When you see "convert this site / paste this URL"**: trigger `transcribe_site`, surface confirmation card, await operator confirm.
2. **After `transcribe_site` succeeds**: call `read_transcription_digest({siteId})`. Then plan.
3. **Plan (in this order)**:
   1. Apply `themeTokens` via `set_theme_token` (palette, typography, layout).
   2. For each entry in `perPagePlan` beyond the first home page, call `add_page({ slug, title, after_slug })`.
   3. For each page, walk `suggestedModuleTypes` and call `add_module`. Then `set_module_content` for each module using:
      - text content from `extractedContent`
      - image fields pointed at `/assets/{r2Key}` from `assetInventory` (match by visual proximity — for the hero, use the largest img in the page's inventory; for a gallery, use sequential images).
   4. Skip any module whose inventory/content can't be matched. Don't fabricate content.
4. **Asset reference rules**: image field values are always `/assets/{r2Key}`. Never use the source's external URL. Never use a 1stcontact bundled asset.
5. **Fallback policy**: if `read_transcription_digest` returns `digest_not_found`, the convert hasn't run successfully — apologise to the operator and ask them to paste the URL again.
6. **Conversational tone**: surface what was applied succinctly. Name low-confidence sections explicitly.

### `apps/control-app/src/operator/registry.ts`

- Register `read_transcription_digest` (system_action).
- Register `add_page`, `remove_page`, `reorder_pages` (state_edit).
- Adjust `transcribe_site` registry entry: description updated to reflect "mechanical only" semantics; payload shape doc updated.

### Test fixtures

- Reuse [[REQ-28]]'s `tests/fixtures/convert-flow/assets-heavy/` and `duplicate-asset/`.
- Add `tests/fixtures/convert-flow/multi-page/` — 3 HTML pages (`index.html`, `menu.html`, `contact.html`) linked from a shared header nav, sharing a single logo asset. Used by AC10. Cardinality (3) is illustrative — the code path supports unbounded N.

## OUT (explicitly deferred)

- Nav-editing tools (`set_nav_pattern`, `set_nav_entries`) — stay in [[REQ-14]] backlog.
- `duplicate_module` — stays in [[REQ-14]] backlog.
- Standalone sitemap discoverer (e.g. `/sitemap.xml`) — stays in [[REQ-21]] / [[REQ-22]] scope. Multi-page here is driven by nav-link cache hits.
- Asset-mirror race fix — Stage 2 now runs inline before digest write so the digest is internally consistent; the previously-noted "external URLs render before R2 swap" race no longer applies in this design.
- A formal `set_nav_pattern` call invoked during convert — the AI may set nav via existing tools if it chooses; explicit nav reconstruction is not part of the AC.
- Pixel-equivalent reproduction. The AC is "recognizably the source": same palette, similar fonts, same text, same images, similar page count. Layout fidelity is best-effort.
- Confidence reporting on modules. [[REQ-28]] added it; here, with synthesis moved to the chat AI, confidence is implicit in the AI's narrative (low-confidence sections are named in chat per the how-to doc). No machine-readable per-module confidence field.
- Real-LLM end-to-end testing in CI. The killer demo against live Claude is a manual smoke test, not an automated UAT.

## Dependencies

- [[REQ-3]] — site-schema validator; the new page-CRUD tools run input through it.
- [[REQ-9]] — Operator API + system-action framework; new actions register here.
- [[REQ-10]] — slug rules; page-CRUD tools enforce the `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` format.
- [[REQ-14]] — overlap with page-mgmt section; REQ-30 closes that section, REQ-14 retains nav + duplicate_module.
- [[REQ-20]] — `ASSETS_BUCKET` binding for digest read/write.
- [[REQ-21]] — Reference Digest + asset inventory; `perPagePlan` derives from this.
- [[REQ-22]] — Browser Rendering screenshots + computed signals; `screenshotKey` lives in `perPagePlan`.
- [[REQ-28]] — predecessor; this REQ reshapes its Stage 3, removes its LLM synthesis path, repurposes its mirror loop.

## Acceptance criteria

1. **Digest written to R2.** After `transcribe_site` completes successfully, `sites/{siteId}/transcription/digest.json` exists in `ASSETS_BUCKET` and contains a valid `TranscriptionDigest` (schema-validated).
2. **Handler payload contains no synthesized site.** The action result is `{ kind: 'transcribe_site_done', digestKey, summary }`. No `site`, `modules`, `themeTokens`, or `narrative` fields.
3. **`read_transcription_digest` returns the digest.** A call against the just-written key returns the same JSON. A call against a missing key returns `{ status: 'failed', error: contains 'digest_not_found' }`.
4. **Page CRUD tools mutate the working draft.**
   - `add_page({ slug: 'menu', title: 'Menu' })` on a single-page site results in the working draft having two pages, `/` and `/menu`, in that order. Empty modules on the new page.
   - `remove_page({ slug: 'menu' })` removes the page; remaining pages keep their order; any nav entries pointing at `menu` are gone.
   - `remove_page` on the only page fails with `cannot_remove_only_page`.
   - `reorder_pages({ slugs: [...] })` with a list missing a page or repeating one fails validation.
5. **Internal Opus synthesis removed.** `packages/extractor/src/transcribe.ts` no longer contains `composePromptForTranscription`, `buildSiteFromTranscription`, `validateTranscription`, `parseTranscriptionFromLlm`, or `buildHeroOnlyFallback`. Grepping the codebase for these names returns no production-code matches.
6. **Chat system prompt references the how-to doc.** `buildSystemPrompt` includes the contents of `docs/llm-context/reproducing-a-website.md`. The doc exists, is markdown-valid, and covers the six numbered sections in §IN.
7. **Per-page plan present.** Against `tests/fixtures/convert-flow/assets-heavy/`, the digest's `perPagePlan` has at least one entry; against the multi-page fixture, `perPagePlan` has multiple entries with distinct `slug` values.
8. **Asset inventory references R2 keys.** Every `assetInventory[].r2Key` in the digest is a non-empty string of the form `sites/{siteId}/imports/{sha256-prefix}.{ext}`. Mirror failures appear in `mirrorSummary.failures`, not in `assetInventory` (failed assets are excluded from the inventory the AI is given).
9. **End-to-end killer demo (mocked LLM).** UAT drives a stubbed chat loop against `tests/fixtures/convert-flow/assets-heavy/` end-to-end. The LLM is mocked with a scripted tool-call sequence (no real Anthropic call). The resulting working draft has (a) ≥1 page; (b) theme tokens applied from the digest's `themeTokens` (palette + typography differ from 1stcontact defaults); (c) at least one module whose image content field resolves to `/assets/sites/{siteId}/imports/…`; (d) at least one module whose text content contains a string present in the fixture's extracted content. Test asserts each property.
10. **Multi-page killer demo (mocked LLM).** UAT against the multi-page fixture: the chat loop (mocked) reads the digest, calls `add_page` for each non-home entry in `perPagePlan`, and the resulting draft has ≥3 pages with distinct slugs. The handler/digest code path imposes no N limit — the 3 in the fixture is illustrative, not a maximum.
11. **No legacy modes.** No code path in `transcribe-site.ts` falls back to the old internal-synthesis behavior. No conditional that switches between "old" and "new" transcription. Per CLAUDE.md "No Legacy Modes".
12. **Backward compatibility for REQ-28 ACs.** The destructive-confirmation flow ([[REQ-28]] AC1-2) and the SSE progress events ([[REQ-28]] AC3-6) continue to work. The two relevant test files from REQ-28 (`test_UAT_FC_REQ-28_transcribe_site_requires_confirmation`, `test_UAT_FC_REQ-28_transcribe_site_stages`) continue to pass after their assertions about Stage-3 module synthesis are relaxed to "digest written".

## Story points

8. Transcribe-site handler reshape + extractor function refactor + 4 new operator actions (1 system_action, 3 state_edit) + new LLM-context doc + chat-prompt wiring + new multi-page UAT fixture + ~15 UATs.

## Notes for reconcile

- This REQ implements the page-CRUD section of [[REQ-14]]. The reconcile step should mark REQ-14's page-management deliverable as done by REQ-30 and leave the nav-editing + duplicate_module sections open.
- Existing REQ-28 implementation has Stage-4 sync-await (per its "Deviations" note). REQ-30 keeps it inline (now Stage 2), which is consistent.


---

## REQ-31: Builder preview panel: Reset button to clear localStorage and reload

## What is the user-visible change?

Add a **Reset** button at the top of the right-hand preview panel in the builder. Clicking it:

1. Shows a confirmation prompt ("Reset the site to the 1stcontact baseline? Edits will be lost.").
2. On confirm: removes the `1stcontact_builder_site_v1` key from `localStorage` and calls `location.reload()`.
3. On cancel: nothing happens.

After reload, the builder cold-loads `/starter-sites/1stcontact.json` and the preview returns to the baked-in demo site.

## Why this matters now

The site preview is persisted to `localStorage` (key `1stcontact_builder_site_v1`, [[REQ-30]] design thread). Between convert-flow demo attempts, the operator has to crack open DevTools and `localStorage.removeItem` manually to reset the baseline — a friction point that interrupts iteration on the killer demo. This adds a one-click reset for the testing workflow.

## Why free-coded

Single small UI affordance. No architecture change, no new tool surface, no data-flow change. Scope is one button + one click handler + a UAT. Belongs in the convert-flow iteration loop, not behind `xgd develop`.

## Test approach

UAT: `tests/builder-ui/test_UAT_FC_REQ-31_preview_panel_reset_button.test.ts` (or matching project convention).

Cases:
1. The preview panel renders a Reset button in its header.
2. Clicking the Reset button calls `localStorage.removeItem('1stcontact_builder_site_v1')` and triggers a `location.reload()` (use injected dependencies / spies — don't actually reload jsdom).
3. If the operator cancels the confirm prompt, neither `removeItem` nor `reload` is called.

Quality scope: builder-ui package tests + composition tests if any cover preview-panel.

## OUT

- Generalising the reset to a "reset to seed" operator AI tool — that's the convert-flow-architecture concern, not a dev affordance. If wanted later it's a separate ticket.
- Persisting "which baseline to reset to" once the multi-site work lands.
- A confirmation modal styled to match the chat-card system — a `window.confirm` prompt is sufficient for the dev affordance.

## Dependencies

- [[REQ-8]] — builder-ui SPA structure.
- [[REQ-12]] — builder chrome lifecycle UI (the preview panel chrome).
- [[REQ-30]] (in-flight) — convert-flow rework that this affordance accelerates iteration on.