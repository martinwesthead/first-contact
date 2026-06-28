---
uid: story-f45a5e61
id: STORY-58
type: story
title: 'Reconstruction blueprint: deterministic transcription digest and read-back'
created_by: xgd
created_at: '2026-06-28T20:28:56.679925+00:00'
updated_at: '2026-06-28T23:48:59.563735+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-e343131c
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-d4ce3987
---

## Story
**As an** operator converting an existing website (and the builder AI acting on my behalf), **I want** the convert flow to produce a structured, deterministic reconstruction blueprint of the source — its palette and typography as theme tokens, one plan entry per discovered page, the source's text content, and an inventory of its images mapped to platform-hosted copies — and to be able to read that blueprint back on demand, **so that** the rebuilt site recognizably reflects the original (its own colours, fonts, page structure, copy, and images) instead of generic framework defaults.

## Description

This story covers the **deterministic building blocks** of the convert flow and the **read-back action** that exposes the result to the chat AI. It is the data contract the rest of the convert flow is built on; the orchestration that runs it and writes the artifact to storage is a separate story (Site Transcription orchestration), and the safe-fetch asset mirroring that supplies the source-URL→hosted-key mapping is another (Asset mirroring).

In scope:
- **Theme-token derivation** — map a Reference Digest's detected palette roles (background, body text, accent, call-to-action) and typography (body + heading families) into a theme-token patch, normalising colours; when a signal is absent the framework default is preserved unchanged. No LLM — fully deterministic and idempotent for a given digest.
- **The transcription digest contract** — a machine-readable blueprint carrying: the derived theme tokens; a per-page plan (one entry per page, each with the page URL, a valid slug derived from the URL path, a human title, a desktop screenshot reference, the page's extracted text content, and an ordered list of suggested module-type hints); an asset inventory whose entries point at platform-hosted (content-addressed) copies of the source's images/backgrounds/videos and additionally carry a precomputed, ready-to-use image AssetRef object the AI can drop straight into an image content field; and a mirror summary.
- **Multi-page discovery** — the per-page plan includes the home page plus any same-origin page the source's nav links to that is already cached. Cross-origin links are excluded. Cardinality is unbounded — no maximum page count is enforced.
- **Content & module-type projection** — deterministic extraction of headings, nav links, and form fields into content blocks, and a deterministic heuristic that orders suggested module types (e.g. a contact-form hint when form fields are present, footer always last). No LLM.
- **Read-back** — an operator/AI action that retrieves the previously written transcription digest for a given site, or reports a not-found failure when none exists, or rejects a request lacking a site identifier.

Out of scope (other stories): the four-stage orchestration handler and confirmation/SSE flow; safe-fetch asset download and R2 write; the builder chat cards; page-CRUD state-edit tools; the chat system-prompt how-to wiring.

## Technical Context

- Grounded in `packages/extractor/src/transcribe.ts` (`deriveThemeTokens`, `applyTokenPatch`, `extractPageContent`, `inferSuggestedModuleTypes`, `slugFromUrl`, `titleFromDigest`, `buildTranscriptionDigest`) and `apps/control-app/src/operator/read-transcription-digest.ts`. The digest artifact is `sites/{siteId}/transcription/digest.json` in the `ASSETS_BUCKET`; asset copies are content-addressed at `sites/{siteId}/imports/{sha256(url):16}.{ext}`.
- Theme-token derivation maps palette roles 1:1 (background→bg, body→text, accent→accent, cta→primary) and typography from the digest's `primaryPair` (or falls back to body / h1 / h2 families); colours are lowercased with a leading `#`. This realises REQ-28's "theme token derivation" decision and is kept unchanged by REQ-30.
- The per-page plan derives additional pages from the home digest's same-origin nav links that already have a cached Reference Digest — there is no standalone sitemap crawler (deferred to REQ-21/REQ-22 scope). The home URL is always the first entry.
- **Divergence / notes for regression:**
  - REQ-30 OUT explicitly drops machine-readable per-module confidence; the theme-token derivation still computes an internal palette/typography/layout `confidence` triple, but it is **not** carried onto the final digest's `themeTokens` (it is dropped when the patch is applied). The digest the AI reads has no confidence field — consistent with REQ-30 intent.
  - REQ-28's spec said the digest is fetched "from the chat history"; REQ-30 supersedes this — the read-back action reads from R2 at the documented key. The intent reconciled here is the REQ-30 net state.
  - The read-back failure surfaces the cause as an error string **containing** `digest_not_found` (prefixed with detail), per the plan's `error contains 'digest_not_found'` contract.
  - The digest-shape acceptance criteria are observable on the persisted digest artifact, which in the running system is produced by the orchestration story; the *contract and derivation* are owned here.
  - **Precomputed image AssetRef (BUG-5).** Each `assetInventory` entry now carries a precomputed `assetRef` object `{ id: r2Key, src: "/assets/<r2Key>", alt: altText ?? "" }`, composed in `buildTranscriptionDigest` and shaped to validate against the framework's image `AssetRef` schema (`id`/`src`/`alt`). This makes the source-image→content-field mapping mechanical: the AI passes the precomputed object verbatim into an image content field rather than composing one (or, per the prior bug, passing a bare `/assets/{r2Key}` string the validator and renderer both reject, yielding empty `<img>` tags).
  - **How-to consumption contract (BUG-5).** The convert-flow reproduction guidance — `docs/llm-context/reproducing-a-website.md` and its inlined mirror in `apps/control-app/src/llm-context.ts` — instructs the AI to set image content fields to the entry's precomputed `assetRef` object (with a worked example), explicitly warning that a bare path string is rejected. This corrects the doc that previously instructed a string path. This is the consumption guidance for *this story's* digest asset-inventory contract; it does not change which how-to documents are wired into the chat system prompt (that wiring remains out of scope here).

## Dependencies

Depends on the Asset mirroring story (plan item 5), which supplies the source-URL → platform-hosted-key mapping and the mirror summary that the asset inventory and mirror-summary sections of the digest are built from.

## Story Points
3