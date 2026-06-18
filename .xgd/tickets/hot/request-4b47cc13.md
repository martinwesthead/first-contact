---
uid: request-4b47cc13
id: REQ-28
type: request
title: 'Site Transcription (Layer B): convert flow that maps a Reference Digest into
  module instances and theme tokens'
created_by: xgd
created_at: '2026-06-16T23:29:01.955584+00:00'
updated_at: '2026-06-18T22:27:10.114144+00:00'
completed_at: null
last_field_updated: story_points
status: draft
fields:
  priority: high
  story_points: 12
  auto_merge_back: true
  needs_review: false
---

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
