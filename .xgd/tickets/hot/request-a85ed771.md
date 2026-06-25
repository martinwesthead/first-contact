---
uid: request-a85ed771
id: REQ-21
type: request
title: Reference Digest schema + static-fetch path + Layer A signal extractors
created_by: xgd
created_at: '2026-06-16T23:24:59.849248+00:00'
updated_at: '2026-06-25T02:41:17.454554+00:00'
completed_at: null
last_field_updated: status
status: bundled
fields:
  priority: high
  story_points: 7
  auto_merge_back: true
  needs_review: false
  commits:
  - e4ac8800875ff8861c8a0bb029f77ba846fbefd1
  bundled_in: bundle-bbb1bd9c
---

## Problem

External-site ingestion needs a single canonical artifact — the Reference Digest — that **both the user and the AI consume**. Per [[DOC-9]] §3 this convergence (one artifact, two audiences) is itself a load-bearing design property: it makes AI reasoning auditable against something the operator can read.

Today there is no fetcher, no digest schema, and no extractor. This REQ lands the foundation: schema, static-fetch path, the deterministic Layer A extractors, and the AI commentary pass that finalizes the digest. The result is a markdown document (sectioned per [[DOC-9]] §9 KMS-aware shape) plus R2-stored screenshots, attached to the chat history that produced it.

## Scope

Land the `packages/extractor` package + the `analyze_page` AI tool. After this REQ:

- An AI tool call `analyze_page(url)` produces a Reference Digest record from any same-origin-respecting fetchable URL.
- The Reference Digest is a sectioned markdown document conforming to a stable schema, plus R2 references to screenshot(s) and asset thumbnails.
- The digest is attached to the chat history record and is renderable in the builder via the [[REQ-13]] `<ChatCard>` pattern — `<DigestReport>` is a chat-card variant.
- The AI commentary pass adds a "Summary" block at the top and a "What's missing" sub-section for absent signals.

Browser Rendering escalation is **out of scope for this REQ** — [[REQ-22]] ships that. This REQ uses Worker `fetch` + DOM parsing only. The escalation hook is wired but always returns "static-only" until REQ-22 lands.

## Demo critical-path alignment

This REQ is on the convert-flow demo critical path (paste URL → reproduce site). Per the 2026-06-18 planning chat, [[REQ-23]] / [[REQ-24]] (chat persistence) and [[REQ-27]] (Brief) are deferred. The "Alignment with persistent chat infrastructure" section at the bottom of this REQ describes the future wire-up — not the demo's runtime path. For the demo, `analyze_page` runs through [[REQ-8]]'s in-memory chat handler and the digest record lives only for the lifetime of the page session.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 3, 8 (partially), 9 inline:

- **Crawl depth cap for digest production**: 1 page only — the URL the operator provides. Sitemap discovery and multi-page inspiration crawls are [[REQ-29]]'s concern, not this REQ's.
- **Sparse-signal handling** ([[DOC-9]] §13.9): every signal field in the digest schema is optional. Absent fields are serialized as `not_detected` (string, not null), so the rendered markdown shows the absence as content, not as omission. The AI commentary pass is prompted to produce a "What's missing" line for each major section where signals are absent.
- **Palette role inference**: the extractor outputs 4 named roles — `background`, `body`, `accent`, `cta` — plus an unordered list of up to 6 supporting colors. Role inference uses a small ruleset (largest-area = background, largest-text-color cluster = body, most-saturated non-body = accent, most-contrasting-to-background = cta). When inference is uncertain (low confidence), the role is set to `not_detected` and the color drops into supporting.
- **Typography signals**: extract body family + size + weight; H1 / H2 / H3 family + size + weight; one detected pair (body + heading) labelled as `primary_pair`. Falls back to `not_detected` when computed styles are unavailable (which is most of the static-fetch path; [[REQ-22]] makes this signal much richer).
- **Layout signals**: max content width (in px), centered vs left bias (heuristic on hero block), and an above-the-fold density score (`sparse | balanced | dense`).
- **AI commentary pass**: a single LLM call producing the `Summary` block, per-section commentary, and the `What's missing` sub-section. Model = Anthropic Claude Haiku 4.5 (configured via existing model selector). Prompted with the full digest body but **not** the screenshot in this REQ ([[REQ-22]] adds multimodal once Browser Rendering is in place).
- **Digest persistence**: the digest record is attached to the chat history as a structured `tool_result` payload (per [[REQ-13]]'s structured tool_results model). The markdown body lives in the chat record; screenshots live in R2. There is no separate `digests` table.
- **Asset inventory** *(expanded per 2026-06-18 planning chat for the reproduce-the-site demo)*: every referenced media asset is recorded with a `kind` discriminator:
  - `kind: 'img'` — every `<img>` with a real `src` plus its `srcset` URLs.
  - `kind: 'background'` — every inline `style="background-image: url(...)"` and every CSS rule from `<style>` blocks whose `background-image` resolves to a `url(...)`. (Computed background-images from external stylesheets are picked up in [[REQ-22]] once Browser Rendering lands.)
  - `kind: 'video'` — every `<video src>` and every `<source src>` inside a `<video>` element.
  - Each record carries `{ url, alt, classification: hero|product|headshot|testimonial|decorative|unknown, width, height, kind }`. Classification is heuristic (largest-area-near-top = hero, etc.). The inventory is the candidate set the transcription ([[REQ-28]]) picks from when downloading assets to R2.
- **Inventory dedup**: same URL referenced multiple times → one record with a `references: number` count. This is the upstream half of the dedup the transcription ([[REQ-28]] Stage 4) relies on; combined with [[REQ-20]]'s per-URL KV cache it guarantees one fetch per URL across the entire convert flow.

## Design conversation

Full thread: [[CHAT-13]]. Key operator statements that scope this REQ:

> "I'm sure some digested version of the HTML would be much easier for the AI to understand but we need to make sure that it has or is exposing the kind of design content that would enable the AI to meaningfully have that conversation"
> — [[CHAT-13]] turn 2

> "What we should show them I think would be a report about the site number of pages the samples of the content core messaging colors layout navigation. Most of this could be generated entirely automatically with the AI adding a color commentary."
> — [[CHAT-13]] turn 3

> "An interesting observation here is that this could bring the content displayed to the AI to be much closer to the content displayed to the user. Both would be seeing some kind of digested summarized version of this site."
> — [[CHAT-13]] turn 3

The convergence — same digest for user and AI — is the architectural property this REQ instantiates.

From the 2026-06-18 planning chat:

> "our goal is to be able to reproduce their site so it looks as identical as possible using our framework if there are gaps we need to understand what they are"
> — operator framing for the demo

This drives the expanded asset inventory (background-image + video, not just `<img>`) — the digest must surface every candidate visual asset the transcription might want to mirror.

## IN

### `packages/extractor` (new package)

Public surface:

```typescript
type ReferenceDigest = {
  schemaVersion: 1,
  sourceUrl: string,
  fetchedAt: string,    // ISO-8601
  fetchPath: 'static' | 'rendered',
  summary: string,      // AI commentary pass output
  signals: {
    palette: PaletteSignals,
    typography: TypographySignals,
    layout: LayoutSignals,
    imagery: ImagerySignals,
    content: ContentTree,
    assetInventory: AssetRecord[],
  },
  commentary: {
    perSection: { [section: string]: string },
    whatsMissing: string[],
  },
  screenshotKeys: { mobile?: string, tablet?: string, desktop?: string },  // R2 keys; empty in this REQ
}

type AssetRecord = {
  url: string,                                                          // absolute, normalized
  kind: 'img' | 'background' | 'video',
  alt?: string,
  classification: 'hero' | 'product' | 'headshot' | 'testimonial' | 'decorative' | 'unknown',
  width?: number,
  height?: number,
  references: number,                                                  // dedup count
}
```

Every `Signals` sub-type uses `string | 'not_detected'` (or its array equivalent) for individual fields. The schema is exported as a Zod (or equivalent) validator so [[REQ-28]] can validate inputs to the transcription step.

Extractors (deterministic, no LLM):

- `parsePalette(html, baseUrl)` — collects inline + linked CSS colors, runs the role-inference ruleset.
- `parseTypography(html, baseUrl)` — extracts `font-family`, `font-size`, `font-weight` from declared styles only (static fetch can't compute, so this signal is often `not_detected`).
- `parseLayout(html)` — max-width heuristic from declared CSS, hero-block alignment heuristic, density score.
- `parseImagery(html, baseUrl)` — full asset inventory across all three `kind`s:
  - Walks every `<img>`: emits `kind: 'img'` records; expands `srcset` into siblings keyed by their URL.
  - Walks every element with an inline `style` attribute containing `background-image: url(...)`: emits `kind: 'background'` records.
  - Walks every `<style>` block, parses CSS rules, and for every `background-image: url(...)` declaration emits `kind: 'background'` records. (External stylesheets are deferred to [[REQ-22]]'s computed-CSS path.)
  - Walks every `<video src>` and every `<source src>` inside `<video>`: emits `kind: 'video'` records.
  - Resolves every URL to absolute form via `baseUrl`.
  - Dedups by absolute URL across all four discovery paths, incrementing `references`.
- `parseContent(html)` — heading tree, sections, list groups, form fields, nav links.

Renderer:

- `renderDigestMarkdown(digest)` — produces the KMS-aware markdown body ([[DOC-9]] §9 shape: title → Summary block → ToC → numbered sections). This is what gets stored on the chat record. The asset inventory section renders one sub-list per `kind` so the operator can see "5 images, 2 background images, 0 videos" at a glance.

### `apps/control-app` AI tool

`analyze_page` tool added to the AI tool surface:

```
input: { url: string }
output: { ok: true, digest: ReferenceDigest, digestMarkdown: string }
       | { ok: false, error: typed-error }
```

Implementation:

1. Call REQ-20's safety layer (`withFetchSafety`, rate limits, robots check, operator-intent token).
2. `safeFetch(url)` for the HTML body.
3. Run all five `parse*` extractors against the body.
4. Call the AI commentary LLM pass (Haiku 4.5) with the digest body to produce `summary` + `commentary`.
5. Hand back the full `ReferenceDigest` + rendered markdown to the AI dispatch.

### Static-only escalation hook

`shouldEscalateToRendered(digest)` lives in `packages/extractor` and always returns `false` in this REQ. [[REQ-22]] replaces the body.

### Builder UI rendering

`packages/builder-ui` gains a `<DigestReport>` component that consumes a digest record from a structured `tool_result` and renders it via [[REQ-13]]'s `<ChatCard>` pattern. The card is `tone: 'info'`, header "Reference Digest — {sourceUrl}", body renders the digest markdown via the same `react-markdown` pipeline as chat messages, actions row contains "Convert this site" and "Discard" buttons. The asset inventory renders as a structured sub-section showing `img / background / video` counts and a thumbnail strip per kind (thumbnails are external URLs in this REQ; [[REQ-28]] Stage 4 rewrites them to R2 keys after transcription).

`<DigestReport>` is registered with the [[REQ-13]] tool_result dispatcher under `kind: "reference_digest"`.

### KV digest caching

Per [[REQ-20]]'s cache layer, a digest is itself cached for 24 hours keyed on `sha256(url|schemaVersion)`. Cache hit returns the digest from KV without refetching or re-running extractors.

### Test fixtures

A small set of static HTML fixtures under `tests/fixtures/convert-flow/` (shared with [[REQ-22]] and [[REQ-28]]):

- `plain-html-site/` — a 3-section static page with explicit palette, declared typography, two `<img>`, one inline `background-image`, and a `<video src>`. The deterministic baseline.
- `sparse-signal/` — bare-bones HTML with no CSS, one `<img>`, no declared colors or fonts. Exercises `not_detected` paths.

Fixtures are served via vitest + Miniflare's static file route in tests; no real HTTP server needed.

## OUT (explicitly deferred)

- Browser Rendering integration — [[REQ-22]].
- Multi-page crawl, sitemap discovery — [[REQ-29]].
- Layer B transcription to module instances + theme tokens — [[REQ-28]].
- Multi-modal AI commentary using the screenshot — added by [[REQ-22]], not here.
- Non-website reference sources (Figma, Pinterest, PDF) — out of scope per [[DOC-9]] §12.
- **Asset download to R2** — the asset inventory records URLs; the actual download + AssetRef-rewrite happens in [[REQ-28]] Stage 4 (post-transcription), so we only download what the converted site actually references.
- A standalone `digests` D1 table — digest persistence is the chat record.
- Background-image URLs from **external** stylesheets — added by [[REQ-22]] (computed CSS resolves these naturally). This REQ only sees `<style>` blocks + inline `style`.

## Dependencies

- [[REQ-20]] — safety contract (mandatory for every fetch).
- [[REQ-13]] — structured tool_results model + `<ChatCard>` primitive (`<DigestReport>` consumes both).
- [[REQ-20]] — `ASSETS_BUCKET` R2 binding (screenshot keys land here once [[REQ-22]] wires Browser Rendering).
- [[DOC-9]] §3, §6.1, §9 — Reference Digest definition, Layer A signal list, KMS-aware shape.

## Acceptance criteria

1. `analyze_page("https://example.com")` returns a valid `ReferenceDigest` with `schemaVersion: 1`, all five signal categories populated (or `not_detected`), and `digestMarkdown` matching the KMS-aware shape (title, blockquote-summary, `## Table of contents`, numbered sections).
2. Calling `analyze_page` against a URL with no `<link rel="stylesheet">` and no inline `style` attributes: palette and typography signals serialize as `not_detected`; the AI commentary's `whatsMissing` array contains entries for both.
3. Palette role inference: page with `background:#fff; body text:#222; primary button:#2563eb; accent heading:#16a34a`: digest signals expose `{ background:"#fff", body:"#222", cta:"#2563eb", accent:"#16a34a" }`.
4. Asset inventory `kind: 'img'`: page with three `<img>` (a 1200×600 near top, a 400×400 mid-page, a 100×100 in nav): the 1200×600 is classified `hero`; the 100×100 is classified `decorative`; the third is `unknown` if no heuristic matches; each emits exactly one record with `references: 1`.
5. Asset inventory `kind: 'background'`: page with `<section style="background-image: url(/hero.jpg)">` and a `<style>` block declaring `.cta { background-image: url(/cta-bg.png) }`: both URLs are present in the inventory with `kind: 'background'`.
6. Asset inventory `kind: 'video'`: page with `<video src="/intro.mp4"></video>` and `<video><source src="/promo.webm"></video>`: both URLs are present with `kind: 'video'`.
7. Asset inventory dedup: the same `/hero.jpg` referenced from both an inline `background-image` and an `<img src>` produces exactly one record (keyed by absolute URL) with `references: 2` and `kind` set to the first-discovered kind (`img` wins over `background` when both apply).
8. Digest markdown rendering: the `digestMarkdown` field validates as commonmark, contains exactly one H1 (the title), and contains a section per signal category. The asset-inventory section enumerates `img / background / video` counts and lists each asset under its kind.
9. The chat record after a successful `analyze_page` contains a structured `tool_result` of `kind: "reference_digest"` carrying the full digest object; the builder's `<DigestReport>` chat-card renders it via the [[REQ-13]] dispatcher without re-fetching.
10. The KV digest cache returns the cached digest on a second identical `analyze_page` call within 24h; the second call does not invoke `safeFetch` or the LLM pass.
11. The escalation hook (`shouldEscalateToRendered`) is invoked at the right point in the pipeline and always returns `false` in this REQ; the path is exercised by a unit test that documents the integration point for [[REQ-22]].
12. Every failure mode from the safety layer ([[REQ-20]] §Acceptance criteria 1–12) propagates as a typed error on the `analyze_page` `ok:false` branch; no safety failure leaks as an uncaught exception.
13. UAT: operator pastes a URL in chat → AI calls `analyze_page` → `<DigestReport>` chat-card renders in the chat panel with palette swatches, type sample, content tree, asset inventory (with kinds), and AI summary visible. Total wall-clock under 8 seconds for a typical small business site on the static path.

## Story points

7. Schema + 5 extractors (parseImagery now covers 3 asset kinds) + commentary pass + tool dispatch + `<DigestReport>` chat-card variant + KV caching + test fixtures.

---

## Future alignment: persistent chat infrastructure ([[REQ-23]] / [[REQ-24]])

[[REQ-23]] / [[REQ-24]] are deferred from the demo critical path; this section describes the integration once they land. **Not blocking for this REQ.**

- `analyze_page` will be invoked through [[REQ-24]]'s `POST /api/chat` flow.
- The Reference Digest result will persist as a row in [[REQ-23]]'s `chat_messages` table, with the digest record carried in `tool_calls_json`. Screenshot R2 keys (added by [[REQ-22]]) will be referenced from `tool_calls_json` and live in R2 under the existing asset-bucket layout.
- The digest will be reachable later in the same chat via tail-prime + scrollback, and across sessions via [[REQ-24]]'s `search_transcripts` + `read_session_range` tools — no separate "digests" index needed.
- Chat session deletion ([[REQ-23]] cascade) will sweep the referenced screenshot R2 keys.

These integrations require no schema changes here; this REQ's acceptance criteria stand against [[REQ-8]]'s in-memory chat handler.