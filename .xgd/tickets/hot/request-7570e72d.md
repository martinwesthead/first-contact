---
uid: request-7570e72d
id: REQ-33
type: request
title: 'Framework: markdown content fields accept inline string or R2 text-asset union;
  capture writes markdown'
created_by: xgd
created_at: '2026-06-20T00:32:32.584911+00:00'
updated_at: '2026-06-24T17:59:15.124792+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  priority: high
  story_points: 6
  auto_merge_back: true
  needs_review: false
  commits:
  - ee886078120fdbde5c2daae5964e61003f8af50c
  version: 0.14.1236
---

That model has three concrete failures:

1. **Convert flow paraphrases.** The AI's job during convert is to call `set_module_content` for each module's text fields. With no structural barrier against authoring, the LLM rewrites source copy in its own voice instead of preserving it verbatim. ([[BUG-5]] documents the related image-AssetRef miss; the text equivalent is what we're addressing here.)
2. **No clean edit surface.** [[REQ-16]] specs a TipTap WYSIWYG editor that's designed to edit `.md` / `.txt` files in R2 — but no body content currently lives in such files. The editor will have nothing to point at on day one.
3. **Cognitive load on the user.** Body copy buried inside a 260-line JSON document isn't comfortably editable. A naïve user expects to click on the text in the rendered preview and modify it; that path is much cleaner when the data is a discrete file the editor can open.

This REQ introduces a content-shape change that solves all three without forcing every short string into a file or breaking the existing 1stcontact baseline.

## Decisions (closed 2026-06-19)

- **Union representation, per-instance choice.** Any module content field declared `"markdown"` in module meta accepts EITHER an inline string (current behaviour) OR an `AssetRef { kind: 'text', src: '<key>', id: '<key>', alt? }` (new). The choice is per content instance, not per field declaration. Promotion / demotion is free — short inline can be promoted to a file when it grows; a file with one line can be inlined back.
- **Schema discriminator on `AssetRef`.** Add `kind: 'image' | 'text'` (default `'image'`). For `kind: 'text'`: `src` is the R2 key, `alt` becomes optional fallback text shown if read fails, `focalPoint` is dropped (irrelevant). Existing `kind: 'image'` AssetRefs are unaffected — the discriminator defaults preserve their schema shape.
- **Markdown is the lingua franca.** All text content end-to-end is markdown — inline strings, `.md` files, capture output, AI output, TipTap output. One format.
- **Markdown-to-HTML is the renderer's responsibility, executed whenever the renderer is invoked.** Two invocation contexts exist:
  - **Production (Jamstack)**: `tools/generate` invokes `renderSiteToHtml` at **build time**. Markdown → HTML conversion and R2 text-asset resolution happen during build. The output is static HTML files served by the public-site Worker. Visitors never hit a markdown converter, never hit R2 for copy.
  - **Builder preview**: the builder UI invokes `renderSiteToHtml` in the **browser** each time the in-memory store changes. Markdown → HTML conversion happens client-side per edit; text AssetRefs are fetched live via `/api/assets/get/<key>` and treated as markdown bytes (content-type ignored). This path exists because the preview must reflect tool-call edits instantly without a build step.
  - Same renderer code in both — only the invocation timing and the resolver implementation differ.
- **HTML-passthrough sniff for back-compat.** A string starting with `<` (after `trimStart`) is treated as trusted HTML and emitted as-is. The current 1stcontact `<p>...</p>` content keeps working unmodified, with no migration of `sites/1stcontact/site.json`.
- **Asset resolver pattern.** `renderSiteToHtml(site, { resolveAsset })` takes a resolver. Builder preview's resolver: `fetch('/api/assets/get/' + key)`. Production `tools/generate`'s resolver: synchronous R2 read via `ASSETS_BUCKET` (Wrangler / Workers Runtime build context). The resolved markdown is then run through the renderer's markdown-to-HTML pass and inlined into the page output. Public site has zero R2 runtime dependency.
- **Capture writes markdown, mechanically.** `transcribe_site` runs source HTML through an HTML-to-markdown converter (turndown or equivalent) and writes per-section verbatim markdown into R2 at `sites/{siteId}/copy/{moduleId}-{field}.md`. Whether a captured block becomes inline or a file is decided by a deterministic heuristic (size + structural complexity). No LLM involved in the text-writing path.
- **AI gets one new tool: `write_text_asset(key, content)`.** For user-directed edits ("rewrite this paragraph as more formal"). Writes markdown to `/api/assets/put/<key>` and returns confirmation. The existing `set_module_content` tool already accepts an AssetRef as a value — that's how the AI swaps a field between inline and file.
- **R2 path scheme.** `sites/{siteId}/copy/{moduleId}-{field}.md`. Sits inside the existing assets namespace from [[REQ-20]] so it shows up in the asset manager (when [[REQ-16]] ships) alongside images. Content-type `text/markdown`.
- **1stcontact baseline stays inline.** No migration of `sites/1stcontact/site.json` — every current inline string remains valid under the union, the HTML-sniff renderer keeps the existing `<p>` content rendering as-is.

## Scope

After this REQ:

- An operator pastes a URL → `transcribe_site` mirrors images (existing) AND writes per-section markdown files to R2 (new) → the AI's reconstruction calls `set_module_content` passing the digest's pre-built `AssetRef { kind: 'text' }` for any markdown-typed body field, and inline strings for short structural fields like headings.
- The rendered preview reads the markdown from R2 via the resolver and renders it as HTML in the iframe.
- A user editing a body field via TipTap (when [[REQ-16]] lands) edits the markdown `.md` file directly — that file IS the content.
- An operator asking the AI to "rewrite the hero subhead to be punchier" results in either a `set_module_content` call (if the field is inline) or a `write_text_asset` call (if the field is a file ref). The AI picks the right mechanic.

The killer-demo's "same color same fonts **same text** same images" expectation is now structurally enforced for body content: capture writes; AI references; no opportunity to paraphrase.

## IN

### `packages/site-schema`

- Extend `AssetRef` to `{ id, src, alt, kind?: 'image' | 'text', focalPoint? }` with `kind` defaulting to `'image'` for back-compat. For `kind: 'text'`: validator skips `focalPoint`. For `kind: 'image'`: unchanged.
- Extend the markdown content field validation to accept either a string or an AssetRef-text. Concretely: a new branded `MarkdownContent = z.union([z.string(), AssetRefText])` type used by `validateSite` for any module content field whose module meta declares `"markdown"`.
- `validateSite` continues to enforce that an AssetRef-text's `src` is a non-empty string; resolver concerns (does the R2 key exist?) are not the validator's job.

### `packages/framework` — renderer

- `renderSiteToHtml(site, options)` gains an `options.resolveAsset?: (ref: AssetRef) => Promise<string> | string | undefined` parameter. When a module's markdown field value is an AssetRef-text and a resolver is provided, the renderer calls `resolveAsset(ref)` and uses the returned string as the markdown source. If undefined or the resolver throws, the renderer emits `ref.alt ?? ''` as the body and logs a warning.
- Markdown-to-HTML pass: the renderer's markdown field handling first **sniffs**: if the string is non-empty and `trimStart().startsWith('<')`, treat as trusted HTML and emit as-is (this preserves 1stcontact's current `<p>...</p>` inline strings). Otherwise run through a markdown-to-HTML library (`marked` or `markdown-it` — pick one; whichever is lighter and tree-shakeable). Output is HTML.
- Documented invariant: any module that declares a `"markdown"` content field must accept either form; existing modules' render functions only need to read the resolved markdown string (the framework handles the resolution and HTML conversion before the module sees the field).

### `packages/extractor`

- New `htmlToMarkdown(html: string): string` — uses turndown (small, configurable). Configured to keep h1–h6, p, ul/ol/li, strong/em, a, img, code, blockquote; drop scripts, styles, data attributes, custom classes, inline `style=""`. Image references are preserved (turndown's default emits `![alt](src)`); the extractor's caller is responsible for rewriting `src` to R2 keys for any mirrored images.
- `transcribe_site` (in `apps/control-app/src/operator/transcribe-site.ts`) extended: after Stage 4 (asset mirror) completes, run a Stage 5 — for each source section's extracted body HTML, call `htmlToMarkdown`, rewrite embedded image URLs to `/assets/{r2Key}` from the asset inventory, and `PUT` the result to `sites/{siteId}/copy/{sectionSlug}.md` (content-type `text/markdown`).
- The digest written to R2 (per [[REQ-30]]) gains, per `extractedContent` entry, a `copy: { kind: 'text', src: '<r2Key>', id: '<r2Key>', alt?: '<first-line>' }` field — a ready-made AssetRef the AI drops directly into `set_module_content`. The size heuristic ("does this become an inline string or a file?") is computed at digest-write time: blocks under 200 characters and without block-level structure (no `\n\n`, no `#` headings, no lists) → emitted as `inlineMarkdown: '<short string>'` alongside `copy`; the AI is told to prefer inline for short blocks.

### `apps/control-app`

- New operator action `write_text_asset({ key, content })`:
  - Category: `state_edit` (mutates R2-backed state the renderer reads from).
  - Validates `key` matches `sites/{siteId}/copy/[a-z0-9-]+\.md`.
  - Writes `content` to R2 with content-type `text/markdown`.
  - Returns `{ ok: true, key, bytes }`.
- `set_module_content` is unchanged in its handler logic — it already accepts arbitrary content values that pass `validateSite`. The schema change (above) opens up AssetRef-text values for markdown fields.
- The control-app's resolver (called by the iframe preview path) wires `resolveAsset` to a function that maps `AssetRef { kind: 'text', src: key }` to `fetch('/api/assets/get/' + key)` and returns the response body. Image-kind AssetRefs are passed through unchanged (the renderer emits their `src` as-is in `<img>` tags; no fetch needed).

### `apps/public-site` / `tools/generate`

- `tools/generate`'s render pipeline is given a `resolveAsset` function that reads from `ASSETS_BUCKET` synchronously at build time (Workers Runtime / Wrangler context). Each text-kind AssetRef is resolved during build; the markdown bytes flow through the renderer's markdown-to-HTML pass; the static HTML output has the converted content inlined. **Public site serves static HTML only — no R2 reads, no markdown conversion at request time.** This preserves the Jamstack model.

### `docs/llm-context/reproducing-a-website.md`

- Update the how-to. Body-copy fields use `digest.perPagePlan[i].extractedContent[j].copy` (AssetRef object) when present, OR `inlineMarkdown` when present. Worked example for each. The doc no longer instructs the AI to author copy — only to pick which pre-built value to set.

### Tests

UATs in `tests/test_UAT_FC_REQ-32_*`:

1. Schema validates `AssetRef { kind: 'text', src: 'sites/x/copy/y.md', id: 'sites/x/copy/y.md', alt: 'fallback' }`.
2. Schema validates a markdown content field set to an inline string.
3. Schema validates the same field set to an AssetRef-text.
4. Schema rejects an AssetRef-text whose `src` is empty.
5. Renderer with a string-typed markdown field starting with `<p>` emits HTML passthrough unchanged (back-compat sniff).
6. Renderer with a string-typed markdown field starting with `#` runs markdown-to-HTML (no `<p>` until conversion).
7. Renderer with an AssetRef-text markdown field calls the resolver and uses the returned markdown.
8. Renderer with an AssetRef-text and no resolver emits the `alt` fallback.
9. `htmlToMarkdown('<h1>Hi</h1><p>Body <strong>bold</strong></p>')` returns `'# Hi\n\nBody **bold**'` (or equivalent valid markdown).
10. `transcribe_site` against `tests/fixtures/convert-flow/assets-heavy/` writes at least one `.md` file under `sites/{siteId}/copy/` in R2; the digest's matching `extractedContent` entry has a populated `copy` AssetRef.
11. `transcribe_site` short-block heuristic: a captured section whose markdown is < 200 chars and one paragraph emits `inlineMarkdown` (no file).
12. `write_text_asset` action writes a `.md` file to R2 and returns ok.
13. `write_text_asset` rejects a key not matching the path pattern.
14. End-to-end: chat-loop reconstruction of `assets-heavy` produces a draft whose text-block module's body content is the verbatim source text (whitespace-normalized) — assert character equality between the rendered HTML's `<p>` content and the source HTML's `<p>` content, post-turndown roundtrip.

Regression scope: existing REQ-3 validator UATs, REQ-4 renderer UATs (must still pass with inline strings), REQ-28 mirror UATs (unaffected — image mirror path is unchanged), REQ-30 digest UATs (digest schema gains the new `copy` / `inlineMarkdown` fields).

## OUT

- The popup click-to-edit modal — separate REQ. This one establishes the data shape and capture mechanic; the editor UX lands on top.
- A REQ-16 asset-manager UI implementation — separate ticket, already specced.
- Markdown-link rewriting beyond image refs (e.g. rewriting source-site internal links to 1stcontact page slugs). Captured markdown keeps source-site absolute URLs in `[text](href)`; smart link rewriting is its own concern.
- A migration of `sites/1stcontact/site.json` from inline `<p>` HTML to markdown. The sniff handles back-compat; the baseline stays inline.
- Per-module confidence reporting for captured copy. Capture is mechanical; either it copied source text successfully or it raised a Stage-5 failure that surfaces in the operator chat summary.
- Video file references inside captured markdown. Turndown's default doesn't emit them; source videos remain external-URL refs until a separate REQ widens scope.
- ALL OF [[BUG-3]], [[BUG-4]], [[BUG-5]]: the nav-routing, consent-button, and image-AssetRef fixes are independent. This REQ doesn't touch them.

## Dependencies

- [[REQ-3]] — site-schema validator (the union extension goes here).
- [[REQ-4]] — framework renderer + module meta (markdown field handling).
- [[REQ-20]] — R2 assets bucket + routes (used unchanged).
- [[REQ-21]] / [[REQ-22]] — digest + browser rendering (source HTML extraction is the input to `htmlToMarkdown`).
- [[REQ-28]] — `transcribe_site` orchestration (gains Stage 5).
- [[REQ-30]] — convert-flow rework (digest schema gains `copy` / `inlineMarkdown` per entry; how-to doc is updated to reference this REQ's mechanics).
- [[REQ-16]] (non-blocking) — TipTap editor will edit these `.md` files when it ships.

## Acceptance criteria

1. `AssetRef` schema accepts `kind: 'image' | 'text'` with default `'image'`. Existing inline AssetRefs (without `kind`) continue to validate as image.
2. `validateSite` accepts a `"markdown"`-typed content field set to either an inline string or an `AssetRef { kind: 'text' }`.
3. `validateSite` rejects an `AssetRef { kind: 'text' }` with empty `src`.
4. Renderer with an inline string starting with `<` emits the string as trusted HTML (current 1stcontact baseline UATs continue to pass with no migration).
5. Renderer with an inline string NOT starting with `<` runs the markdown-to-HTML pass before emitting.
6. Renderer with an `AssetRef { kind: 'text' }` field value calls the provided `resolveAsset` function and uses the returned markdown.
7. Renderer with an `AssetRef { kind: 'text' }` and no resolver emits the `alt` fallback (or empty string if no alt).
8. `htmlToMarkdown` produces valid markdown for the standard subset (headings, paragraphs, lists, emphasis, links, images, inline code, blockquote). Custom CSS/classes/scripts are dropped silently.
9. `transcribe_site` against the killer-demo fixture writes at least one `.md` file per captured page section above the inline threshold and populates the digest's corresponding `copy` field with a valid AssetRef-text.
10. `transcribe_site`'s short-block heuristic correctly chooses `inlineMarkdown` for sub-200-char single-paragraph captures.
11. `write_text_asset({ key, content })` writes to R2 and returns `{ ok: true, key, bytes }`. The key validator rejects keys outside the `sites/{siteId}/copy/...md` pattern.
12. `docs/llm-context/reproducing-a-website.md` instructs the AI to use `extractedContent[j].copy` (when present) or `inlineMarkdown` for body fields — with a worked example. The doc no longer suggests the AI author body text.
13. End-to-end: chat-loop reconstruction of `assets-heavy` produces a draft whose text-block module's body content matches the verbatim source text after turndown round-trip (character equality on a normalized comparison).
14. `tools/generate` renders a multi-page site whose modules use text-kind AssetRefs and produces static HTML with the markdown content inlined — no R2 fetches from the public site at runtime.

## Story points

6. Schema (1) + renderer (1) + resolver wiring (1) + html-to-markdown + transcribe Stage 5 (1) + write_text_asset action + how-to doc (1) + UATs and end-to-end fixture work (1).

## Notes for reconcile

- This REQ supersedes part of [[BUG-5]]'s fix scope: the doc-update to instruct AI on the correct format becomes "use `digest.copy` AssetRef refs verbatim." [[BUG-5]]'s image-side correction is independent and stays.
- The renderer's markdown-to-HTML pass is new; the markdown library (`marked` or `markdown-it`) is the only new runtime dependency in `packages/framework`. Bundle-size budget is a concern for the public-site worker — pick the lighter library and lazy-load the markdown pipeline only when a markdown field is encountered if bundle creep matters.

-
◀ xgd 0.14.1239 2026-06-20 11:14:10