---
uid: story-f45a5e61
id: STORY-58
type: story
title: 'Reconstruction blueprint: deterministic transcription digest and read-back'
created_by: xgd
created_at: '2026-06-28T20:28:56.679925+00:00'
updated_at: '2026-06-30T01:39:00.295559+00:00'
completed_at: null
last_field_updated: story_kind
status: reconciling
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-e343131c
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-d4ce3987
  - bundle-4e8020d6
---

## Story
**As an** operator converting an existing website (and the builder AI acting on my behalf), **I want** the convert flow to produce a structured, deterministic reconstruction blueprint of the source — its palette and typography as theme tokens, one plan entry per discovered page, the source's text content, and an inventory of its images mapped to platform-hosted copies — and to be able to read that blueprint back on demand, with the convert failing loudly at each stage rather than ever serving stale or unconfirmed data, **so that** the rebuilt site recognizably reflects the original (its own colours, fonts, page structure, copy, and images) instead of generic framework defaults, and the AI is never misled by a stale, partially-written, or silently-failed blueprint.

## Description

This story covers the **deterministic building blocks** of the convert flow, the **read-back action** that exposes the result to the chat AI, and the **digest freshness / write-integrity guarantees** that keep both honest. It is the data contract the rest of the convert flow is built on; the four-stage orchestration *mechanics* that run it (staging, confirmation, SSE progress) are a separate story (Site Transcription orchestration), and the safe-fetch asset mirroring that supplies the source-URL→hosted-key mapping is another (Asset mirroring).

In scope:
- **Theme-token derivation** — map a Reference Digest's detected palette roles (background, body text, accent, call-to-action) and typography (body + heading families) into a theme-token patch, normalising colours; when a signal is absent the framework default is preserved unchanged. No LLM — fully deterministic and idempotent for a given digest.
- **The transcription digest contract** — a machine-readable blueprint carrying: the derived theme tokens; a per-page plan (one entry per page, each with the page URL, a valid slug derived from the URL path, a human title, a desktop screenshot reference plus a ready-to-use `screenshotUrl` (`/assets/<screenshotKey>`, empty when no screenshot was captured), the page's extracted text content, and an ordered list of suggested module-type hints); an asset inventory whose entries point at platform-hosted (content-addressed) copies of the source's images/backgrounds/videos and additionally carry a precomputed, ready-to-use image AssetRef object the AI can drop straight into an image content field; and a mirror summary.
- **Multi-page discovery** — the per-page plan includes the home page plus any same-origin page the source's nav links to that is already cached. Cross-origin links are excluded. Cardinality is unbounded — no maximum page count is enforced.
- **Content & module-type projection** — deterministic extraction of headings, nav links, and form fields into content blocks, and a deterministic heuristic that orders suggested module types (e.g. a contact-form hint when form fields are present, footer always last). No LLM.
- **Read-back** — an operator/AI action that retrieves the previously written transcription digest for a given site, or returns a distinct, non-error `not_ready` status when none is present yet (so the AI can poll while a convert is mid-flight), or rejects a request lacking a site identifier.
- **Digest freshness & write integrity (REQ-37)** — before any mechanical work the convert evicts any prior digest for the site, so a re-run or mid-flight convert never serves the previous convert's data; after writing the digest the convert reads it back and verifies the `capturedAt` sentinel round-trips, failing with `digest_write_unverified` on drift instead of silently reporting success; and un-mirrored assets are surfaced per-URL with a reason at the convert's tool-return summary boundary (`summary.assetFailures`).

Out of scope (other stories): the four-stage orchestration *mechanics* — staging, confirmation, and SSE progress flow (the freshness/write-integrity *guarantees* above are owned here even though they execute within that handler); safe-fetch asset download and R2 write; the builder chat cards; the client-side tool-failure panel and re-injection; page-CRUD state-edit tools; the chat system-prompt how-to wiring.

## Technical Context

- Grounded in `packages/extractor/src/transcribe.ts` (`deriveThemeTokens`, `applyTokenPatch`, `extractPageContent`, `inferSuggestedModuleTypes`, `slugFromUrl`, `titleFromDigest`, `buildTranscriptionDigest`), `apps/control-app/src/operator/read-transcription-digest.ts`, `apps/control-app/src/operator/transcribe-site.ts` (Stage-0 digest eviction + post-write read-back verification + `summary.assetFailures`), and `apps/control-app/src/operator/registry.ts` (read-back tool spec). The digest artifact is `sites/{siteId}/transcription/digest.json` in the `ASSETS_BUCKET`; asset copies are content-addressed at `sites/{siteId}/imports/{sha256(url):16}.{ext}`.
- Theme-token derivation maps palette roles 1:1 (background→bg, body→text, accent→accent, cta→primary) and typography from the digest's `primaryPair` (or falls back to body / h1 / h2 families); colours are lowercased with a leading `#`. This realises REQ-28's "theme token derivation" decision and is kept unchanged by REQ-30.
- The per-page plan derives additional pages from the home digest's same-origin nav links that already have a cached Reference Digest — there is no standalone sitemap crawler (deferred to REQ-21/REQ-22 scope). The home URL is always the first entry.
- **Divergence / notes for regression:**
  - REQ-30 OUT explicitly drops machine-readable per-module confidence; the theme-token derivation still computes an internal palette/typography/layout `confidence` triple, but it is **not** carried onto the final digest's `themeTokens` (it is dropped when the patch is applied). The digest the AI reads has no confidence field — consistent with REQ-30 intent.
  - REQ-28's spec said the digest is fetched "from the chat history"; REQ-30 supersedes this — the read-back action reads from R2 at the documented key. The intent reconciled here is the REQ-30 net state.
  - **Read-back no-digest is now a pollable status (REQ-37).** When no digest is present the read-back returns `ok` with `{ kind: 'transcription_digest_not_ready', digestKey }` rather than the prior `digest_not_found` failure. REQ-37 supersedes the earlier not-found-failure contract: a missing digest is an expected polling state (convert not yet run, or mid-flight after Stage-0 eviction), so it must not surface as a hard tool error.
  - **Stage-0 digest eviction (REQ-37).** `transcribe_site` deletes `sites/{siteId}/transcription/digest.json` from `ASSETS_BUCKET` before any mechanical work (alongside REQ-34's scaffold reset), so a re-run or mid-flight convert never hands back the previous convert's digest.
  - **Digest write read-back verification (REQ-37).** After `put`-ting the digest, `transcribe_site` `get`s it back and asserts the round-tripped `capturedAt` equals what it wrote; a missing object, unparseable JSON, or `capturedAt` drift returns a `digest_write_unverified` failure. Guards against eventual-consistency drift, a racing writer, or a silently-dropped put.
  - **Per-URL asset failures at the tool boundary (REQ-37).** The digest's internal mirror summary already carried a per-URL `failures` list; REQ-37 additionally surfaces it on the convert's tool-return payload as `summary.assetFailures` (each `{ url, reason }`) so the operator/AI sees exactly what didn't fetch without parsing the digest.
  - These three integrity guarantees execute inside the orchestration handler (`transcribe-site.ts`) but are documented here as properties of this story's digest / read-back contract, per the BUNDLE-6 reconciliation plan.
  - The digest-shape acceptance criteria are observable on the persisted digest artifact, which in the running system is produced by the orchestration story; the *contract and derivation* are owned here.
  - **Per-page screenshotUrl (REQ-49).** Each per-page plan entry carries a
    `screenshotUrl` derived as `/assets/<screenshotKey>` (the already-served
    assets path), or an empty string when no desktop screenshot key is present.
    This gives the chat AI a stable URL to hand to Anthropic vision without
    reverse-engineering the `/assets/` routing convention. It adds no new digest
    derivation behaviour — it is a presentation field on the existing digest
    contract.
  - **Precomputed image AssetRef (BUG-5).** Each `assetInventory` entry now carries a precomputed `assetRef` object `{ id: r2Key, src: "/assets/<r2Key>", alt: altText ?? "" }`, composed in `buildTranscriptionDigest` and shaped to validate against the framework's image `AssetRef` schema (`id`/`src`/`alt`). This makes the source-image→content-field mapping mechanical: the AI passes the precomputed object verbatim into an image content field rather than composing one (or, per the prior bug, passing a bare `/assets/{r2Key}` string the validator and renderer both reject, yielding empty `<img>` tags).
  - **How-to consumption contract (BUG-5).** The convert-flow reproduction guidance — `docs/llm-context/reproducing-a-website.md` and its inlined mirror in `apps/control-app/src/llm-context.ts` — instructs the AI to set image content fields to the entry's precomputed `assetRef` object (with a worked example), explicitly warning that a bare path string is rejected. This corrects the doc that previously instructed a string path. This is the consumption guidance for *this story's* digest asset-inventory contract; it does not change which how-to documents are wired into the chat system prompt (that wiring remains out of scope here).
  - **How-to names image-gallery for sequential images (REQ-41).** The same reproduction guidance (`docs/llm-context/reproducing-a-website.md` and its byte-for-byte inlined mirror in `apps/control-app/src/llm-context.ts`) extends the visual-proximity matching guidance to name `image-gallery` as the catalog target for sequential image content (largest image → hero; sequential images → `image-gallery`; small square images → service icons), and documents that `image-gallery` populates its `items[]` one entry per asset, each entry being `{ image: <assetRef>, caption?: <string> }`, with captions pulled from `extractedContent` when present and otherwise left unset rather than fabricated. This is consumption guidance for how the AI maps this story's digest asset inventory onto the `image-gallery` module (added by the framework module catalog story); it adds no new digest behaviour and does not change the chat system-prompt wiring (still out of scope here).

## Dependencies

Depends on the Asset mirroring story (plan item 5), which supplies the source-URL → platform-hosted-key mapping and the mirror summary that the asset inventory and mirror-summary sections of the digest are built from.

## Story Points
3