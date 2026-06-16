---
uid: request-a85ed771
id: REQ-21
type: request
title: Reference Digest schema + static-fetch path + Layer A signal extractors
created_by: xgd
created_at: '2026-06-16T23:24:59.849248+00:00'
updated_at: '2026-06-16T23:24:59.849248+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 7
  auto_merge_back: true
  needs_review: false
---

## Problem

External-site ingestion needs a single canonical artifact — the Reference Digest — that **both the user and the AI consume**. Per [[DOC-9]] §3 this convergence (one artifact, two audiences) is itself a load-bearing design property: it makes AI reasoning auditable against something the operator can read.

Today there is no fetcher, no digest schema, and no extractor. This REQ lands the foundation: schema, static-fetch path, the deterministic Layer A extractors, and the AI commentary pass that finalizes the digest. The result is a markdown document (sectioned per [[DOC-9]] §9 KMS-aware shape) plus R2-stored screenshots, attached to the chat history that produced it.

## Scope

Land the `packages/extractor` package + the `analyze_page` AI tool. After this REQ:

- An AI tool call `analyze_page(url)` produces a Reference Digest record from any same-origin-respecting fetchable URL.
- The Reference Digest is a sectioned markdown document conforming to a stable schema, plus R2 references to screenshot(s) and asset thumbnails.
- The digest is attached to the chat history record and is renderable in the builder's right panel by [[REQ-13]]-style structured tool_results.
- The AI commentary pass adds a "Summary" block at the top and a "What's missing" sub-section for absent signals.

Browser Rendering escalation is **out of scope for this REQ** — REQ C ships that. This REQ uses Worker `fetch` + DOM parsing only. The escalation hook is wired but always returns "static-only" until REQ C lands.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 3, 8 (partially), 9 inline:

- **Crawl depth cap for digest production**: 1 page only — the URL the operator provides. Sitemap discovery and multi-page inspiration crawls are REQ F's concern, not this REQ's.
- **Sparse-signal handling** ([[DOC-9]] §13.9): every signal field in the digest schema is optional. Absent fields are serialized as `not_detected` (string, not null), so the rendered markdown shows the absence as content, not as omission. The AI commentary pass is prompted to produce a "What's missing" line for each major section where signals are absent.
- **Palette role inference**: the extractor outputs 4 named roles — `background`, `body`, `accent`, `cta` — plus an unordered list of up to 6 supporting colors. Role inference uses a small ruleset (largest-area = background, largest-text-color cluster = body, most-saturated non-body = accent, most-contrasting-to-background = cta). When inference is uncertain (low confidence), the role is set to `not_detected` and the color drops into supporting.
- **Typography signals**: extract body family + size + weight; H1 / H2 / H3 family + size + weight; one detected pair (body + heading) labelled as `primary_pair`. Falls back to `not_detected` when computed styles are unavailable (which is most of the static-fetch path; REQ C makes this signal much richer).
- **Layout signals**: max content width (in px), centered vs left bias (heuristic on hero block), and an above-the-fold density score (`sparse | balanced | dense`).
- **AI commentary pass**: a single LLM call producing the `Summary` block, per-section commentary, and the `What's missing` sub-section. Model = Anthropic Claude Haiku 4.5 (configured via existing model selector). Prompted with the full digest body but **not** the screenshot in this REQ (REQ C adds multimodal once Browser Rendering is in place).
- **Digest persistence**: the digest record is attached to the chat history as a structured `tool_result` payload (per [[REQ-13]]'s structured tool_results model). The markdown body lives in the chat record; screenshots live in R2. There is no separate `digests` table.
- **Asset inventory**: every `<img>` with a real `src` is recorded with `{ src, alt, classification: hero|product|headshot|testimonial|decorative|unknown, width, height }`. Classification is heuristic in this REQ (largest-area-near-top = hero, etc.); finer classification can come later via Layer B.

## Design conversation

Full thread: [[CHAT-13]]. Key operator statements that scope this REQ:

> "I'm sure some digested version of the HTML would be much easier for the AI to understand but we need to make sure that it has or is exposing the kind of design content that would enable the AI to meaningfully have that conversation"
> — [[CHAT-13]] turn 2

> "What we should show them I think would be a report about the site number of pages the samples of the content core messaging colors layout navigation. Most of this could be generated entirely automatically with the AI adding a color commentary."
> — [[CHAT-13]] turn 3

> "An interesting observation here is that this could bring the content displayed to the AI to be much closer to the content displayed to the user. Both would be seeing some kind of digested summarized version of this site."
> — [[CHAT-13]] turn 3

The convergence — same digest for user and AI — is the architectural property this REQ instantiates.

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
```

Every `Signals` sub-type uses `string | 'not_detected'` (or its array equivalent) for individual fields. The schema is exported as a Zod (or equivalent) validator so REQ E can validate inputs to the transcription step.

Extractors (deterministic, no LLM):

- `parsePalette(html, baseUrl)` — collects inline + linked CSS colors, runs the role-inference ruleset.
- `parseTypography(html, baseUrl)` — extracts `font-family`, `font-size`, `font-weight` from declared styles only (static fetch can't compute, so this signal is often `not_detected`).
- `parseLayout(html)` — max-width heuristic from declared CSS, hero-block alignment heuristic, density score.
- `parseImagery(html, baseUrl)` — img inventory + role classification heuristic.
- `parseContent(html)` — heading tree, sections, list groups, form fields, nav links.

Renderer:

- `renderDigestMarkdown(digest)` — produces the KMS-aware markdown body ([[DOC-9]] §9 shape: title → Summary block → ToC → numbered sections). This is what gets stored on the chat record.

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

`shouldEscalateToRendered(digest)` lives in `packages/extractor` and always returns `false` in this REQ. REQ C replaces the body.

### Builder UI rendering

`packages/builder-ui` gains a `<DigestReport>` component that consumes a digest record from a structured `tool_result` and renders it in the right panel (per [[REQ-13]]'s structured tool_results model). Rendering uses the same `marked` pipeline as chat messages so the digest's markdown body renders consistently with the rest of the chat.

### KV digest caching

Per [[REQ-20]]'s cache layer, a digest is itself cached for 24 hours keyed on `sha256(url|schemaVersion)`. Cache hit returns the digest from KV without refetching or re-running extractors.

## OUT (explicitly deferred)

- Browser Rendering integration — [[REQ-21]] (REQ C below).
- Multi-page crawl, sitemap discovery — [[REQ-25]] (REQ F below).
- Layer B transcription to module instances + theme tokens — [[REQ-24]] (REQ E below).
- Multi-modal AI commentary using the screenshot — added by REQ C, not here.
- Non-website reference sources (Figma, Pinterest, PDF) — out of scope per [[DOC-9]] §12.
- Asset download to R2 for the `<img>`s themselves — the asset inventory records URLs; downloads happen via [[REQ-16]]'s asset-put endpoint when the operator (or transcription) actually wants them.
- A standalone `digests` D1 table — digest persistence is the chat record.

## Dependencies

- [[REQ-20]] — safety contract (mandatory for every fetch).
- [[REQ-13]] — structured tool_results model (digest is delivered as a structured result).
- [[REQ-16]] — R2 binding (screenshot keys land here once REQ C wires Browser Rendering).
- [[DOC-9]] §3, §6.1, §9 — Reference Digest definition, Layer A signal list, KMS-aware shape.

## Acceptance criteria

1. `analyze_page("https://example.com")` returns a valid `ReferenceDigest` with `schemaVersion: 1`, all five signal categories populated (or `not_detected`), and `digestMarkdown` matching the KMS-aware shape (title, blockquote-summary, `## Table of contents`, numbered sections).
2. Calling `analyze_page` against a URL with no `<link rel="stylesheet">` and no inline `style` attributes: palette and typography signals serialize as `not_detected`; the AI commentary's `whatsMissing` array contains entries for both.
3. Palette role inference: page with `background:#fff; body text:#222; primary button:#2563eb; accent heading:#16a34a`: digest signals expose `{ background:"#fff", body:"#222", cta:"#2563eb", accent:"#16a34a" }`.
4. Image inventory: page with three `<img>` (a 1200×600 near top, a 400×400 mid-page, a 100×100 in nav): the 1200×600 is classified `hero`; the 100×100 is classified `decorative`; the third is `unknown` if no heuristic matches.
5. Digest markdown rendering: the `digestMarkdown` field validates as commonmark, contains exactly one H1 (the title), and contains a section per signal category.
6. The chat record after a successful `analyze_page` contains a structured `tool_result` of type `reference_digest` carrying the full digest object; the builder's `<DigestReport>` renders the right panel from it without re-fetching.
7. The KV digest cache returns the cached digest on a second identical `analyze_page` call within 24h; the second call does not invoke `safeFetch` or the LLM pass.
8. The escalation hook (`shouldEscalateToRendered`) is invoked at the right point in the pipeline and always returns `false` in this REQ; the path is exercised by a unit test that documents the integration point for REQ C.
9. Every failure mode from the safety layer ([[REQ-20]] §Acceptance criteria 1–12) propagates as a typed error on the `analyze_page` `ok:false` branch; no safety failure leaks as an uncaught exception.
10. UAT: operator pastes a URL in chat → AI calls `analyze_page` → digest report renders in right panel with palette swatches, type sample, content tree, asset inventory, and AI summary visible. Total wall-clock under 8 seconds for a typical small business site on the static path.
