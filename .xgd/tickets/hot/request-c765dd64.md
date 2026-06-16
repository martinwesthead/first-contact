---
uid: request-c765dd64
id: REQ-22
type: request
title: 'Browser Rendering integration: JS-rendered fetch path with screenshots and
  computed-CSS signals'
created_by: xgd
created_at: '2026-06-16T23:26:13.165904+00:00'
updated_at: '2026-06-16T23:34:02.918720+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: high
  story_points: 6
  auto_merge_back: true
  needs_review: false
---

## Problem

The static-fetch path from [[REQ-21]] handles plain-HTML sites well but is structurally blind to:

- SPA shells where the body is `<div id="root"></div>` and content hydrates from JS.
- Computed CSS — declared values from `<style>` blocks miss anything resolved by cascade / inheritance / responsive media queries that didn't match the no-window static parser.
- Above-the-fold visual signals — alignment, density, hero composition — that require seeing pixels, not DOM.
- The killer-demo screenshot strip that [[DOC-9]] §7.3 names as the visceral 0–2s reveal in the convert flow.

Browser Rendering — Cloudflare's `@cloudflare/puppeteer` binding — is the architecturally-aligned escalation per [[DOC-9]] §10.2: same Worker substrate, no new infra. This REQ wires it.

## Scope

Add the JS-rendered fetch path to `packages/extractor`. After this REQ:

- The escalation hook from [[REQ-21]] (`shouldEscalateToRendered`) makes a real decision based on body density.
- When escalation is triggered, the fetcher invokes Browser Rendering via `@cloudflare/puppeteer`, navigates, waits for hydration, captures three screenshots (mobile / tablet / desktop), and extracts computed CSS for the Layer A signals that the static path could not resolve.
- Screenshots are uploaded to R2 ([[REQ-16]]'s `ASSETS_BUCKET` under a `references/` prefix) and the digest record's `screenshotKeys` are populated.
- The AI commentary pass becomes multimodal: the desktop screenshot is fed as image input to the Haiku 4.5 commentary call so the AI can comment on what it sees, not just signal bullet lists.
- All consumption goes through [[REQ-20]]'s safety layer: every request consumes from the Browser Rendering budget; budget exhaustion gracefully degrades to static-only with a typed `tool_result` note.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 2 (budget — already nailed in REQ-20, restated here for scope clarity) and 6 (transcription confidence, partial — multimodal commentary):

- **Escalation heuristic**: escalate when the static fetch returns either (a) a `<body>` whose visible text length is under 200 characters, or (b) a document with `<script>` totalling > 80% of body byte count, or (c) the operator explicitly requests "render this page" (an `analyze_page` parameter `forceRendered: true`). All three conditions are tested in unit tests.
- **Screenshot viewports**: 390×844 (mobile portrait, iPhone 13 reference), 820×1180 (tablet, iPad Air reference), 1440×900 (desktop). PNG, full-page (long captures, not just above-the-fold), capped at 8 MB each — anything larger discards the screenshot for that viewport with a `screenshot_too_large` note.
- **Wait strategy**: `waitUntil: 'networkidle0'` with a 10-second timeout. If the page hasn't settled in 10 seconds, capture what's there. Each navigation counts toward the per-session 50-browser-second budget from [[REQ-20]].
- **Computed CSS extraction**: a small `getComputedStyle` script runs in the page after networkidle, returning the computed `font-family`, `font-size`, `font-weight` for `<body>`, `<h1>`, `<h2>`, `<h3>`, plus the `background-color` for `<body>` and the largest above-the-fold element. The result feeds back into `parseTypography` and `parsePalette` to refine signals beyond what static parsing produced.
- **Multimodal AI commentary**: when a desktop screenshot is available, it is included as an image content block in the Haiku 4.5 commentary call alongside the digest body. Prompt explicitly asks the AI to comment on what's *seen* (alignment, density, imagery treatment) in addition to what's in the signal bullets.
- **R2 layout**: screenshots stored at `references/{chatId}/{turnId}/{viewport}.png`. Content-Type `image/png`. No per-asset TTL; cleanup is the same chat-deletion sweep [[DOC-9]] §3.3 names.
- **Budget-exhaustion behaviour**: when [[REQ-20]]'s budget middleware returns `budget_exhausted`, the fetcher falls back to the static path, marks the digest's `fetchPath: 'static'`, and appends a `whatsMissing` entry: "Visual signals unavailable — Browser Rendering budget exhausted for this session." No retry. No silent failure.

## Design conversation

Full thread: [[CHAT-13]]. Most relevant operator framing for this REQ:

> "The other very powerful on boarding experience might be something like this. I explained that I am a local plumber trying to create a new website for my new business. Our tool does a search for local plumber websites scans the top 3 to 5 and has a discussion with the user about what they like and dislike about these sites. This is interesting in this context we would want to use the right hand panel to display a completely different website. It's an eye frame though so that should be possible right?"
> — [[CHAT-13]] turn 2

The iframe answer landed at "iframe by default with screenshot fallback when blocked"; per [[CHAT-13]] turn 3 the operator then escalated to "actually I like the idea of screenshots for the user too" — so screenshots are the primary display surface, not the fallback. This REQ produces those screenshots.

> "For the aesthetic dialogue you describe (alignment, palette, centering), **the screenshot itself matters a lot** — fed to the model as a multimodal input, the AI can talk about design the way a human would."
> — assistant in [[CHAT-13]] turn 2, accepted by the operator's silence + advance

This is why the multimodal AI commentary pass is in scope here.

## IN

### `packages/extractor` additions

- `renderedFetch(url, ctx)` — invokes `BROWSER` binding (Cloudflare Browser Rendering) via `@cloudflare/puppeteer`. Navigates, waits, captures the three screenshots, extracts computed CSS, returns `{ html, computedStyles, screenshots }`. Goes through [[REQ-20]]'s budget middleware.
- `shouldEscalateToRendered(staticResult)` — replaces the stub from [[REQ-21]]. Implements the escalation heuristic above. Returns `{ escalate: boolean, reason: string }`.
- `mergeComputedSignals(layerASignals, computedStyles)` — refines the digest's typography + palette signals with computed-style data. Computed signals always win over declared signals when both exist; declared remain when computed is absent.
- `uploadScreenshots(screenshots, ctx, { chatId, turnId })` — uploads each viewport screenshot to R2 under `references/{chatId}/{turnId}/{viewport}.png` and returns the keys for the digest record. Uses the existing R2 binding from [[REQ-16]].

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
- The `analyze_page` tool dispatch from [[REQ-21]] is amended: after the static parse runs, `shouldEscalateToRendered` decides; if escalation fires, the rendered path runs and `mergeComputedSignals` produces the final signals.
- The optional `forceRendered: boolean` parameter is added to the `analyze_page` AI tool input schema; documented in the tool description as "use only when the operator explicitly asks for a rendered analysis."

### Builder UI

- `<DigestReport>` from [[REQ-21]] gains a screenshot strip (mobile / tablet / desktop) rendered from the R2 keys via `/assets/{key}` (the same route [[REQ-16]] serves). The strip is the first element in the rendered report so the operator's first visual is the page itself.

## OUT (explicitly deferred)

- Iframe-based live display surface — [[DOC-9]] §7.2 marks this as "secondary fallback"; not built in v1. The "click to open in new tab" affordance is sufficient.
- Per-element computed-style extraction beyond the listed selectors — keeps the in-page script small and the budget consumption low.
- Above-the-fold screenshot crops (in addition to full-page) — full-page suffices for the AI's multimodal input and for the operator's right-panel report.
- Pre-render JS execution against a custom user-agent (e.g. mobile UA string for the mobile viewport) — viewport size is the only mobile signal in v1.
- Browser pooling / warm-instance management — Cloudflare Browser Rendering handles this; we do not.
- Per-site cookie / login flows ("render this dashboard behind auth") — out of scope.

## Dependencies

- [[REQ-20]] — safety contract + Browser Rendering budget middleware.
- [[REQ-21]] — Reference Digest schema + the escalation hook this REQ replaces.
- [[REQ-16]] — `ASSETS_BUCKET` R2 binding (screenshots land here).
- [[DOC-9]] §7.3 — progressive reveal pattern (mobile/tablet/desktop screenshots are the 0–2s element).

## Acceptance criteria

1. `shouldEscalateToRendered` returns `escalate: true, reason: "thin_body"` for a body with under 200 characters of visible text, and `escalate: false` for a body with rich text content.
2. `shouldEscalateToRendered` returns `escalate: true, reason: "js_dominant"` for a document where `<script>` content is over 80% of body bytes.
3. With `forceRendered: true` in the `analyze_page` input, escalation always fires regardless of heuristic.
4. `renderedFetch` against a known JS-rendered SPA returns a hydrated `html` with > 1000 characters of visible text and computed styles for `<body>` and `<h1>`.
5. After a successful rendered fetch, the digest's `signals.typography.body.fontFamily` reflects the computed style, not `not_detected`.
6. Three screenshots are uploaded to R2 at the expected key shape; the digest's `screenshotKeys` carries all three; each PNG is under 8 MB.
7. Calling `/assets/{screenshotKeys.desktop}` returns the screenshot bytes with `Content-Type: image/png`.
8. The AI commentary pass for a digest with an attached desktop screenshot includes at least one sentence referring to visual properties (alignment, density, treatment, layout) — verified by prompt-and-response pattern matching, not just length.
9. With Browser Rendering budget exhausted ([[REQ-20]] §Acceptance 9 condition), `analyze_page` returns a digest with `fetchPath: 'static'` and a `whatsMissing` entry citing the exhausted budget. The call succeeds; it does not return `ok: false`.
10. The builder `<DigestReport>` renders the screenshot strip at the top of the right panel; the screenshots are visible without scrolling on a 1440-wide builder layout.
11. UAT: operator pastes the URL of a JS-rendered SPA → AI calls `analyze_page` → escalation fires → digest report renders with all three screenshots and computed typography in the right panel. Total wall-clock under 30 seconds.


---

## Alignment with persistent chat infrastructure (REQ-23 / REQ-24)

[[REQ-23]] / [[REQ-24]] landed after this REQ was drafted. R2 screenshot keys are referenced from the digest's `tool_calls_json` row in [[REQ-23]]'s `chat_messages` table; chat-session deletion cascade-sweeps the screenshots. No schema change here; the integration is the existing `tool_result` payload reaching the `chat_messages` row through [[REQ-24]]'s `POST /api/chat` dispatcher.

## Additional dependencies (alignment)

- [[REQ-23]] — `chat_messages` schema (screenshot R2 keys persist in `tool_calls_json`).
- [[REQ-24]] — Chat dispatcher (the path `analyze_page` runs through).
- [[DOC-10]] §4.4 — attachment policy.
