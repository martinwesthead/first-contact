---
uid: request-8561a708
id: REQ-30
type: request
title: 'Convert flow rework: mechanical transcribe_site + R2 digest + page-CRUD tools
  + LLM how-to doc'
created_by: xgd
created_at: '2026-06-19T22:07:48.306894+00:00'
updated_at: '2026-06-19T23:01:52.919327+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: high
  story_points: 8
  auto_merge_back: true
  needs_review: false
  commits:
  - 44c637a259abe504282c8bcb50b3994800f5b127
  - 1d249b0884d37f0cc8eca955ae9ee98f789c7c50
  version: 0.14.1234
---

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