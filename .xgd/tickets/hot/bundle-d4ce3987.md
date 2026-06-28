---
uid: bundle-d4ce3987
id: BUNDLE-5
type: bundle
title: BUG-4 + BUG-3 + BUG-5 + BUG-7 + REQ-32 + 5 more
created_by: xgd
created_at: '2026-06-28T21:47:10.033371+00:00'
updated_at: '2026-06-28T21:47:16.663379+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  commits:
  - 6003f943d9ade04bdf1158da9cc9947ba3548de6
  - 44a5b1ff95164fbf7400e334318341c4f806a7ca
  - 9af6424ae38fa664f94591efe6f8bc56ee0844b5
  - 502d741b2b57068764909b543b7a1b5188749599
  - 273be62303ec4746e766b737bfeded0cd58b25e2
  - c67a3b6162829e4847c69a69dadf6368bb6752ea
  - f4a53f1579599dc9c994a920139530186001d46c
  - a82d98b0c7710ea916d50022ad3e2b22f97f8e1d
  - 160f42644686598285ed2e6c42823b50ac5d4a47
  - 42b83a1a100fd88ebccd23f069dd0a750cab9d40
  - 40e1261e9ae788fb3940c67dc16ae3192aaeae61
  - c8de81b286400621849a933d507dda1f4a9f793c
  auto_merge_back: true
  priority: medium
---

# Bundle

This ticket bundles the following source tickets:


---

## BUG-4: Convert flow: ConvertConfirmation Confirm/Cancel buttons are unwired

## ⚠️ Superseded by [[REQ-35]] (landed)

[[REQ-35]] has landed (xgd-working commit 58fce2bce264137fade6564aa1b0c73a993c2876) and removes the destructive-confirmation gate entirely. The code BUG-4 was attempting to fix no longer exists: `<ConvertConfirmation>` is deleted, the `fc:convert-confirmed` / `fc:convert-cancelled` listener bridge is gone, and `transcribe_site` proceeds end-to-end on every invocation. **Do not implement BUG-4 — it is obsolete.**

The two fixes BUG-4 itself shipped (registering the renderer at boot, adding the listener bridge, threading `x-session-id` through chat-driver) were reverted as part of REQ-35 to the extent they were tied to the gate, except for `x-session-id` forwarding — that survives in `runChatTurn` and `bootBuilder`'s session-id resolution because it remains useful infrastructure for any session-scoped operator action.

---

## Original symptom (kept for history)

In the builder, the convert flow surfaced a **ConvertConfirmation** chat-card asking the operator to confirm before transcription overwrote the draft. Two failure modes:

1. **Pre-card rejection**: `transcribe_site` rejected before any card rendered, with error `session_id required to track convert confirmation`. The browser's chat driver was not sending the `x-session-id` header.
2. **Post-card no-op**: Once a card *did* render, clicking **Confirm** did nothing visible — the card collapsed but the AI never re-invoked `transcribe_site`. The operator had to type "yes" into chat for transcription to proceed.

## Original root cause (kept for history)

Three missing wires across boot, transport, and event-bridging:

1. **`registerConvertConfirmation()` was never called.** The renderer was exported from `convert-confirmation.ts` but `bootBuilder` did not register it, so the dispatcher had no route for `kind: 'convert_confirmation'`.
2. **No event listener existed for the card's actions.** The Confirm button dispatched `fc:convert-confirmed` on the document but nothing listened.
3. **No `x-session-id` header was sent.** `runChatTurn` only set `content-type`, so `extractSession` returned `session_id: null` and `transcribeSiteHandler` rejected outright.

## Original fix (kept for history; partially reverted by REQ-35)

Wired the renderer at boot, attached document-level listeners that drove a synthetic user turn via `runChatTurn`, and threaded a per-tab session id through chat-driver. REQ-35 removed the renderer, the listeners, and the gate itself. The `x-session-id` plumbing remains — it's general-purpose, not tied to convert-confirmation.

## Closeout

Closing this bug out as obsolete is part of REQ-35's acceptance criteria. No further action required on this ticket.


---

## BUG-3: Builder preview: multi-page nav links navigate iframe to control-app root

## Symptom

In the builder at http://localhost:8788/builder?site=1stcontact, after a successful convert flow against a multi-page source site, clicking any page tab in the rendered preview iframe navigates the iframe away to `http://localhost:8788/<slug>`, which hits the control-app catch-all and renders the text **"Hello from app.1stcontact.io"**.

Reproduction: convert any multi-page source (e.g. `https://joyfulculinarycreations.com/`); wait for the converted site to land; click any non-home page tab in the preview; iframe replaces itself with the control-app root response.

## Root cause

The framework renderer is shared between two emission targets — the production Astro static-site generator and the in-browser builder preview — but the nav-href format only matches production.

- `packages/framework/src/render/browser.ts:147-152` — `navHref` returns absolute paths like `/menu`, `/contact`. Correct for production (Astro emits separate HTML files per page).
- `packages/builder-ui/src/preview.ts:9-19` — the preview iframe is populated via `document.open / write / close` with the single-document HTML produced by `renderSiteToHtml`. There is **no link-click interception** and no client-side page-switching logic.
- `apps/control-app/src/index.ts:63-66` — the worker's catch-all returns "Hello from app.1stcontact.io" for any unknown path, so the iframe's navigation to `/menu` ends up rendering that.

The preview was built to display a single page and the multi-page case was never finished — the renderer adopted the production link format wholesale.

## Fix

Make the preview iframe handle in-document page switching without an HTTP round trip. Two viable shapes:

1. **Fragment-based nav** (preferred for minimal renderer touch): emit `#/menu` from `navHref` when the renderer is invoked in preview mode (new `target: 'preview' | 'production'` option, default production for backward compat); the preview driver (`renderSiteIntoIframe`) installs a `hashchange` listener on the iframe's `contentWindow` that re-runs `renderSiteToHtml(site, { pageId })` for the matched page and re-writes the iframe.
2. **Click-interception nav**: keep `navHref` as `/menu`; preview driver intercepts `click` on all anchor elements inside the iframe, prevents default, parses the path → pageId, re-renders.

Shape 1 is more declarative and survives the case where the iframe is reloaded by other means. Implement that.

Production output is unchanged — the new `target` option defaults to production.

## Test plan

UATs in `tests/test_UAT_FC_BUG-XX_*`:

1. **Renderer respects target option**: `renderSiteToHtml(site, { target: 'preview' })` produces nav links with `#/menu` hrefs; default / `target: 'production'` produces `/menu`. Render a 2-page site, grep the resulting HTML's nav block.
2. **Preview iframe handles hashchange**: with a 2-page site rendered into a jsdom iframe via `renderSiteIntoIframe`, dispatch a `hashchange` to `#/menu` on the iframe's content window. Assert the iframe's body is now rendering the `menu` page's modules (e.g. a unique module id from page 2 is present).
3. **No regression on home page**: clicking the home-page nav link (hash `#/`) re-renders the home page; the home modules are visible; the menu modules are gone.

Regression scope: existing REQ-8 preview UATs (`test_UAT_FC_REQ-8_tool_call_applies_to_preview.test.ts`, `test_UAT_FC_REQ-8_preview_fills_panel_height.test.ts`) — both pass after the change.
## Implementation notes

Implemented per Shape 1 (fragment-based nav). Files changed:

- `packages/framework/src/render/browser.ts` — added `target: 'preview' | 'production'` option to `RenderSiteOptions` (default `'production'`, so production output is unchanged); threaded through `renderPageBody` / `renderModuleInstance` / `dispatchRenderer` / `renderHeader` to `navHref`, which emits `#/<pageId>` for `kind:'page'` entries in preview mode and `/<pageId>` in production mode.
- `packages/framework/src/render/index.ts` — re-exported the new `RenderTarget` type.
- `packages/builder-ui/src/preview.ts` — `renderSiteIntoIframe` now tracks per-iframe state in a `WeakMap`, resolves the active pageId from the iframe's hash, renders with `target: 'preview'`, and installs a one-shot `hashchange` listener on the iframe's `contentWindow`. In-page anchor clicks (e.g. `#contact`) do NOT switch pages — only `#/<pageId>` hashes trigger a re-render. Unknown pageIds fall back to the first page.

UATs landed in `tests/test_UAT_FC_BUG-3_*`:

- `test_UAT_FC_BUG-3_renderer_target_emits_hash_nav.test.ts` — production output unchanged; preview emits `#/<pageId>`.
- `test_UAT_FC_BUG-3_preview_hashchange_switches_page.test.ts` — `#/menu` swaps to menu page; `#/` returns to home; unknown `#/nonexistent` falls back to first page.
- `test_UAT_FC_BUG-3_preview_anchor_hash_preserves_current_page.test.ts` — in-page anchors do not trigger page switch.

Shared fixture: `tests/_helpers_BUG-3_multipage_site.ts` (minimal 2-page site with `kind:'page'` nav entries).

Regression scope verified: all REQ-8 preview UATs pass; full suite (320 tests across 148 files) passes.

### Commit-message caveat

The commit carrying this work is `ccfd392b7a07ed5490ace376b3f2b47ede5cf15a`. A concurrent automation swept the staged BUG-3 files into a commit whose subject claims to be about `xgd_version_bump` and references REQ-648 — the documented `git add -A` workflow-engine gap (LIFECYCLE-FRAGILE-INTENT.md §6). The commit body still carries `[FREE-CODED]` and the actual file contents are the BUG-3 fix; reconcile reads code via cherry-pick so this does not affect correctness. Worth a glance if cross-referencing git log to the ticket.


---

## BUG-5: Convert flow: how-to doc instructs string image paths but schema requires AssetRef

## Symptom

After running the convert flow against a source site with images (e.g. `https://joyfulculinarycreations.com/`), the converted preview renders **no images at all** — `<img>` tags are either absent from the rendered HTML or have empty `src` attributes. The R2 mirror runs successfully; the digest's `assetInventory[]` is populated with `r2Key`s; the `/api/assets/get/<key>` route works. The chat AI is calling `set_module_content` for image fields. But the image never lands on the page.

This breaks the user's stated demo expectation ("same color same fonts same text, **same images**") and REQ-30's AC9 ("at least one module whose image content field resolves to `/assets/sites/{siteId}/imports/…`").

## Root cause

Type mismatch between the LLM context doc and the framework schema.

- **The schema requires an `AssetRef` object** for any image content field. `packages/site-schema/src/schema.ts:24-34`:
  ```ts
  export const AssetRef = z.object({
    id: z.string().min(1),
    src: z.string().min(1),
    alt: z.string(),
    focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  });
  ```
- **The renderer reads `.src` off the object** at `packages/framework/src/render/browser.ts:161` — `const image = content<{ src: string; alt: string }>(instance, "image"); ... <img src="${escapeAttr(image!.src)}" ...`. If `image` is a string, `.src` is undefined and the renderer either omits the tag or emits a broken one.
- **The how-to doc instructs the AI to pass a string** at `docs/llm-context/reproducing-a-website.md` (the convert-flow guidance added by REQ-30): "image fields take `/assets/{r2Key}` where `r2Key` comes from `digest.assetInventory`." The AI follows the doc, calls `set_module_content({ field: "image", value: "/assets/sites/.../abc.jpg" })`, and one of two things happens: (a) the validator rejects the call because `"/assets/..."` is not a valid `AssetRef`, or (b) the validator accepts it (depending on how `set_module_content`'s validator narrows the content schema) and the renderer can't get `.src` off a string. Either way, no image.

All the upstream layers are healthy:

- R2 mirror loop in `apps/control-app/src/operator/transcribe-site.ts` runs and writes assets to `sites/{siteId}/imports/{sha256}.{ext}`.
- Digest JSON written to R2 with populated `assetInventory[]` entries carrying `{ sourceUrl, r2Key, kind, altText? }`.
- `apps/control-app/src/assets/routes.ts:64-71` serves `/api/assets/get/<key>` and `/assets/<key>` from R2.

The bug is exclusively at the LLM-instruction layer.

## Fix

Two changes, both small:

1. **Fix the how-to doc**: `docs/llm-context/reproducing-a-website.md` must tell the AI to construct an `AssetRef` object. Example excerpt the doc should now contain:
   ```
   For each image field, set the value to:
   { id: "<r2Key>", src: "/assets/<r2Key>", alt: "<altText from inventory>" }
   ```
   With at least one worked example so the AI has a model to copy.

2. **Enrich the digest's `assetInventory` so the mapping is mechanical**: add a precomputed `assetRef` field to each `AssetInventoryEntry` containing the exact `{ id, src, alt }` object the AI should drop into `set_module_content`. This removes any ambiguity about how to compose the `id` / `src` / `alt` fields and stops a future doc drift from re-introducing the bug. Extractor change in `packages/extractor/src/transcribe.ts`'s `buildTranscriptionDigest`.

After this fix, the AI's call shape becomes:
```
set_module_content({
  page_id: "home",
  instance_id: "hero-1",
  field: "image",
  value: digest.assetInventory[i].assetRef,  // ready-made object
})
```

## Test plan

UATs in `tests/test_UAT_FC_BUG-XX_*`:

1. **Doc states the AssetRef format**: read the doc file, assert it contains an example matching the AssetRef shape. Catches doc drift.
2. **Digest's assetInventory carries a precomputed assetRef**: `buildTranscriptionDigest(...)` against a fixture with at least one mirrored asset produces an entry whose `assetRef` is a valid `AssetRef` object (validated against the schema).
3. **End-to-end: image renders**: against a fixture with a single image, run the full chat-loop reconstruction (mocked Opus call), and assert the rendered preview HTML contains an `<img src="/assets/sites/.../...">` tag.

Regression scope: REQ-28's mirror UATs (`test_UAT_FC_REQ-28_mirror_asset_to_r2.test.ts` and related) — the mirror loop is unchanged. REQ-30's digest UATs should be updated to assert the new `assetRef` field.


---

## BUG-7: Dev workflow: pnpm dev:control does not rebuild builder SPA bundle on source change

## Symptom

Running `pnpm dev:control` and editing source in `packages/builder-ui/src/**` or `packages/framework/src/**` produces no visible change in the browser at http://localhost:8788/builder, no matter how many times the page is reloaded (even with cache disabled) and no matter how many times the dev server is restarted.

Discovered while testing the BUG-3 fix: the BUG-3 changes were merged to `xgd-working` and the dev server restarted, but the browser kept showing the pre-fix behavior. The "missing" REQ-31 Reset button (which has been on `main` since well before BUG-3) was the giveaway that the SPA bundle was old, not just my fix.

Reproduction:

1. `pnpm dev:control` from repo root.
2. Open http://localhost:8788/builder.
3. Edit any file under `packages/builder-ui/src/` or `packages/framework/src/` — e.g. add a `console.log` to `packages/builder-ui/src/main.ts` `bootBuilder`.
4. Hard-reload the browser.
5. The `console.log` is never emitted; the running SPA is the bundle that was last built by `pnpm --filter @1stcontact/control-app build:bundle`.

## Root cause

The builder SPA is served as a static asset, not as live source.

- `apps/control-app/package.json:6` — `"dev": "wrangler dev --port 8788"`. No file-watcher, no rebuild step.
- `apps/control-app/wrangler.toml:7-9` — `[assets] directory = "public"`, so wrangler serves `apps/control-app/public/_assets/builder.js` for `/builder/_assets/builder.js`.
- `apps/control-app/scripts/build-builder-bundle.mjs` — esbuild bundles `packages/builder-ui/src/spa.ts` into `public/_assets/builder.js`. Only invoked by `build:bundle`, `build`, `deploy`, `dryrun` — never by `dev`.

Result: a developer who runs `pnpm dev` and edits builder-ui or framework code sees no change in the browser. The only signal is "the page is the version frozen at the last `build:bundle` invocation" — silent staleness.

This caused real wasted time on the BUG-3 fix (~30 min of "is my fix not working? is the browser caching? is localStorage corrupting state?") before realizing the bundle itself was stale.

## Fix (shipped)

Option 1 from the original analysis — `concurrently` in the `dev` script, watch mode added to the existing bundler script.

- `apps/control-app/scripts/build-builder-bundle.mjs` now accepts `--watch`. When set, it uses esbuild's `context().watch()` to rebuild incrementally instead of running a one-shot `esbuild.build()`. Logs `Watching <entry> → <outfile>` after the first build so the dev loop is visible.
- `apps/control-app/package.json` adds `build:bundle:watch` (`node scripts/build-builder-bundle.mjs --watch`) and rewires `dev` to:
  `concurrently -k -n bundle,wrangler -c yellow,magenta "pnpm build:bundle:watch" "wrangler dev --port 8788"`.
  `concurrently` is already a root devDependency.

The build path consumes TS source directly via esbuild's dep graph, so edits anywhere in the entry graph — both `packages/builder-ui` and `packages/framework` — trigger an incremental rebuild without further plumbing.

## Test plan

A UAT covers both modes of the bundler:
`tests/test_UAT_FC_BUG-7_build_bundle_watch.test.ts`

1. **One-shot** (no `--watch`): spawns the script, asserts exit code 0, asserts `Built …builder.js` log, asserts the output bundle exists and is non-empty.
2. **Watch** (`--watch`): spawns the script, waits for the `Watching` log line, captures the bundle's mtime, bumps the entry source's mtime (`utimes`) to trigger esbuild's watcher, then polls the bundle's mtime for up to 15s and asserts it advances. The subprocess is killed in a `finally` block; a session-scoped `afterAll` SIGKILLs any stragglers.

Run: `pnpm test tests/test_UAT_FC_BUG-7_build_bundle_watch.test.ts` — both tests pass in well under a second on a warm cache.

Manual smoke (the original test plan, still valid):

1. `pnpm dev:control` from the repo root.
2. Observe the initial build log from the watcher, then `wrangler` startup.
3. Open http://localhost:8788/builder.
4. Edit `packages/builder-ui/src/main.ts` — add `console.log("WATCH-OK")` inside `bootBuilder`.
5. Save; observe the esbuild rebuild log within ~200ms.
6. Hard-reload the browser; confirm `WATCH-OK` appears in the console.
7. Repeat with `packages/framework/src/render/browser.ts` to confirm the cross-package dep graph is watched.


---

## REQ-32: Chat panel: block send while turn in flight (spinner + disabled button)

## Symptom

The chat panel's Send button stays enabled while an in-flight chat turn is still
running. The operator gets no visual indication that the previous send is still
in progress, and can fire repeat send clicks that race the response.

## Behaviour change

While a chat turn is in flight (between Send click / Cmd+Enter submit and the
moment `onSend` resolves):

1. The Send button displays a spinner in place of the "Send" label.
2. The Send button is disabled — clicks and Cmd+Enter submit are no-ops.
3. The editor stays editable so the operator can type their next message.
4. When the turn settles (resolves or throws), the button returns to "Send"
   and re-enables. If `onSend` throws, the busy state is still cleared so the
   UI does not get stuck.

The turn-in-flight state is owned by the chat panel itself, not by an external
store — `onSend` is async, and the panel tracks the promise it returned.

## UI notes

- Spinner is a CSS-only rotating element; no SVG/asset dependency.
- The button keeps its width so the row does not reflow when the spinner
  appears.
- `aria-busy="true"` is set on the button while in-flight so assistive tech
  reports the state.
- An empty input still no-ops on click — that path returns before the
  busy state is entered.

## Test plan

UATs under `tests/test_UAT_FC_REQ-32_*`:
- Send button is disabled and shows a spinner while `onSend` is pending.
- Click during in-flight state does not fire a second `onSend` call.
- Cmd+Enter during in-flight state does not fire a second `onSend` call.
- Editor remains editable (focusable, accepts input) during in-flight state.
- Button returns to "Send" and re-enables after `onSend` resolves.
- Button returns to "Send" and re-enables after `onSend` rejects.


---

## REQ-33: Framework: markdown content fields accept inline string or R2 text-asset union; capture writes markdown

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


---

## REQ-35: Convert flow: remove destructive-confirmation gate (defer copyright/robots concerns)

## What is the user-visible change?

Remove the destructive-confirmation gate from the convert flow. After this REQ, when the operator (or AI) invokes `transcribe_site(digestId)`:

- No `ConvertConfirmation` chat-card is shown.
- No "I own this site" checkbox is presented.
- No `convertConfirmed[chatId]` flag is checked.
- The action proceeds immediately to the mirror / digest / AI-reconstruction phases.

The operator just types "convert this URL" (or the equivalent) and the convert runs.

## Why this matters now

The safety protocol introduced by [[REQ-28]] AC1-2 (`ConvertConfirmation` card + flag + `requires_confirmation` gate) has three problems in practice:

1. **It's broken.** [[BUG-4]] documents that the Confirm button's click dispatches an event with no listener, and `registerConvertConfirmation()` is never called in `bootBuilder`. The card doesn't actually gate anything reliably — the operator types a confirmation in chat to work around it.
2. **It's the wrong UX shape.** A confirmation modal on every convert attempt is friction in a flow where the user is iterating dozens of times. The risk it was protecting against (accidental destructive overwrite of the operator's draft) is better addressed by the Reset button ([[REQ-31]]) plus the clear-on-import behaviour ([[REQ-34]]) — the operator can always recover.
3. **The copyright / robots concern it was conflating** (the "I own this site" checkbox folded a robots-override into the confirmation) is a real concern but deserves its own UX, not a piggyback on a destructive-action modal. We will come back to it as a separate ticket once the more fundamental convert-flow issues are settled.

For testing iteration on the convert flow, this gate is the single biggest friction point. Removing it unblocks the testing cycle.

## Why free-coded

Pure deletion of a feature plus a one-line behaviour change in the action handler. No new design, no tests for new behaviour — the tests being removed are tests for the removed code.

## Decisions

- **Remove, don't disable.** No "feature flag" or "behind a config toggle." Delete the gate code; delete the `ConvertConfirmation` component; delete the `requires_confirmation` return path. If we add a copyright/robots gate back in a future ticket, it will be a fresh shape designed for that concern alone.
- **The "I own this site" checkbox and its robots-override registration are dropped along with the rest.** The underlying robots-override mechanism in [[REQ-20]] stays — there's just no path through the convert flow that sets it. A separate operator action for per-origin robots overrides can come back later.
- **[[BUG-4]] is superseded.** Its scope (fix the broken click wiring) becomes moot. Close it out as obsoleted by this REQ.
- **The `ConvertConfirmation` test fixtures and UATs are removed.** Code that doesn't exist doesn't need tests.

## IN

### `apps/control-app/src/operator/transcribe-site.ts`

- Remove the `convertConfirmed[chatId]` check.
- Remove the `requires_confirmation` early-return / typed-error path.
- Remove the call to `mintConfirmationCard` (or whatever surfaces the chat-card).

### `apps/control-app/src/operator/chat-metadata.ts`

- Delete `convertConfirmed[chatId]` storage entirely.
- Delete the matching `confirm_convert` operator action that mutates it (registry.ts entry + handler).
- Keep `robotsOverrides[origin]` storage — used by the underlying safety contract in [[REQ-20]], unrelated to the convert UX.

### `apps/control-app/src/operator/registry.ts`

- Remove `confirm_convert` from `OPERATOR_ACTIONS`.

### `packages/builder-ui/src/components/convert-confirmation.ts`

- Delete the file.
- Delete its export from `packages/builder-ui/src/index.ts`.

### `packages/builder-ui/src/main.ts`

- Remove any references to `registerConvertConfirmation` / `createConvertConfirmationRenderer` (currently broken-and-unused per BUG-4, but tidy up the import / boot wiring regardless).

### Tests

Remove:
- `tests/test_UAT_FC_REQ-28_transcribe_site_requires_confirmation*.test.ts` (whatever name(s) exist).
- `tests/test_UAT_FC_REQ-28_convert_confirmation_card*.test.ts`.
- Any other test referencing `convertConfirmed`, `requires_confirmation`, or `<ConvertConfirmation>`.

Add (minimal coverage of the new "no-gate" behaviour):

- `tests/test_UAT_FC_REQ-XX_transcribe_site_runs_without_confirmation.test.ts`: invoke `transcribe_site(digestId)` against a fixture, assert it proceeds straight to Stage 1 (mirror) without returning `requires_confirmation` and without surfacing a chat-card.

## OUT

- A replacement copyright / robots UX. Deferred — explicit follow-up ticket when we return to it.
- Removal of the underlying `robotsOverrides` storage. The safety contract still uses it; we only remove the convert-flow path that wrote to it.
- The `<TranscribeProgress>` chat-card. Keep it — operators still need to see convert progress; only the confirmation card goes.
- Any change to the destructive-overwrite question for already-populated drafts. [[REQ-34]] addresses that by clearing before convert.

## Dependencies

- [[REQ-28]] — sourced the confirmation gate this REQ removes.
- [[REQ-30]] — convert-flow rework that this REQ further simplifies.
- [[REQ-31]] — Reset button provides the manual-rollback affordance that replaces the confirmation as the safety net.
- [[BUG-4]] — explicitly superseded.

## Acceptance criteria

1. `transcribe_site(digestId)` returns no `requires_confirmation` error under any starting condition. Tested by invocation against the killer-demo fixture and via direct unit-test of the action handler.
2. No `<ConvertConfirmation>` chat-card is rendered anywhere in the builder. The dispatcher doesn't have a renderer registered for `kind: "convert_confirmation"`.
3. No `convertConfirmed` field exists in chat metadata. Grep for `convertConfirmed` across the repo returns zero matches in production code.
4. `confirm_convert` operator action is not registered. `xgd quality run --tests` plus the operator-actions test pass (which enumerates the registry) reports the removal.
5. The previously-existing REQ-28 confirmation UATs are removed (the behaviour they exercised no longer exists).
6. A new UAT verifies `transcribe_site` runs successfully on first invocation against the killer-demo fixture without any prior confirmation flag being set.
7. [[BUG-4]] is closed out as superseded — its body updated with a pointer to this REQ.

## Story points

1. Pure deletion + one UAT for the no-gate path + closing BUG-4. Genuinely a one-line behaviour change at the handler boundary plus surrounding cleanup.

## Notes for reconcile

- This REQ deletes scope that was added by REQ-28. The capability matrix will need to walk back those ACs. The simplest way for the reconciler is to mark REQ-28 ACs 1, 2, and 14 (the "I own this site" checkbox AC) as superseded by this REQ.
- The robots-override mechanism remains in REQ-20's surface — only the convert-flow access path is removed. If the operator has set robots overrides via REQ-20's primary mechanism, those persist.
- The future copyright/robots ticket will likely want a dedicated chat-card type (e.g. `<RobotsOverridePrompt>`) shown when the underlying safety contract blocks a fetch — distinct from a "you are about to destroy your draft" confirmation.


---

## REQ-34: Convert flow: clear existing draft to empty scaffold before AI reconstruction

## What is the user-visible change?

When the operator runs the convert flow against a new source URL, `transcribe_site` first **clears the operator's current draft** to a minimal empty scaffold (one empty home page, default theme tokens, no modules), and THEN runs the existing mirror / digest / AI-reconstruction flow on the clean slate.

After this REQ, the operator looking at the preview after a convert sees **only** what the AI created from the source — no 1stcontact residue, no stale content from a prior convert attempt.

## Why this matters now

Today the convert flow's `transcribe_site` writes asset mirrors and a digest, the AI reads the digest and calls `state_edit` tools (`set_theme_token`, `set_module_content`, `add_module`, ...) against **whatever is currently in the draft**. If the draft is the 1stcontact starter, the AI's calls land on top of 1stcontact's modules — some get mutated, some don't, the theme tokens partially clobber. The result is a confusing mix of source content, 1stcontact content, and AI-paraphrased content (the paraphrase problem itself is solved by [[REQ-33]] for body fields; but the structural contamination remains independent of that).

REQ-28 §Decisions chose "writes directly into the operator's current draft" to win the killer-demo's single-confirmation flow. That decision works only if the starting draft is empty. Since the operator's normal entry point is the 1stcontact starter, every convert is currently a destructive merge rather than a fresh build.

## Why free-coded

Behaviour-only change inside `transcribe_site`'s orchestration. No new schema, no new tool surface. Add a clearing step at the front of the mechanical phase.

## Decisions

- **"Empty scaffold" = one empty home page + default theme tokens.** A `Site` object with `pages: [{ id: 'home', slug: '/', title: '<source business name or "Untitled">', modules: [] }]`, `theme: <framework defaults>`, `nav: { pattern: 'in-page-anchors', entries: [] }`, `config: { businessName: '<source title>' }`. The renderer must already handle this case (it's what a brand-new site looks like before any modules are added) — verify, fix only if needed.
- **Clearing is unconditional on convert.** Every `transcribe_site` invocation clears, even if the draft is already empty. No "if the user has edits, preserve them" branching — the operator's safety net for accidental loss is git history / publish snapshots / the Reset button.
- **Clearing happens in `transcribe_site` itself.** Not as a separate AI tool call the LLM must remember to make. Putting it in the action handler makes it atomic with the convert and removes a possible bug surface (AI forgets to clear).
- **Order: clear → mirror → digest → AI reconstruction.** Clear runs before any mechanical work so the digest write doesn't depend on the cleared state, and the AI reads a freshly-cleared draft when it starts placing modules.
- **No backup of the cleared draft.** The user can use the Reset button to return to the 1stcontact baseline, or pull the prior state from git / D1 history if they need it. This REQ does not add a "restore previous convert" action.

## IN

### `apps/control-app/src/operator/transcribe-site.ts`

- New helper `clearDraftToEmptyScaffold(siteId, sourceUrl, sourceTitle?)`:
  - Constructs the empty scaffold `Site` object (per Decisions).
  - Calls the same persistence path used by `state_edit` actions to write it into the draft state (in-memory for the demo, D1 for the persisted case).
  - Emits an SSE `transcribe_progress` event with `{ stage: 0, status: 'cleared' }` so the operator UX surfaces the action.
- In the orchestration handler, run `clearDraftToEmptyScaffold` immediately after the destructive-confirmation gate succeeds (or immediately on entry, if [[REQ-35]] has removed that gate). Then run mirror / digest / etc.

### `packages/builder-ui/src/components/transcribe-progress.ts`

- The TranscribeProgress chat-card adds a "Stage 0: Clearing draft" line at the top. Updates in place when the SSE event arrives.

### How-to doc

- `docs/llm-context/reproducing-a-website.md` updated: the AI no longer needs to consider "the existing draft has modules I should keep or replace" — it always lands on an empty scaffold. The doc removes any language about clearing/preserving prior state.

### Tests

UATs in `tests/test_UAT_FC_REQ-XX_*`:

1. **`transcribe_site` clears the draft to scaffold before reconstruction**: stub the AI, invoke `transcribe_site` against a fixture, snapshot the draft after Stage 0 — assert it's a 1-page empty scaffold matching the spec.
2. **The cleared draft passes `validateSite`** (renderer must accept an empty-modules home page).
3. **No "merge with existing" path remains**: against a fixture, start with a populated draft (e.g. 1stcontact baseline), invoke `transcribe_site`, assert the draft after Stage 0 has zero modules — none of the prior modules survive.
4. **SSE event fires**: assert a `transcribe_progress` event with `stage: 0, status: 'cleared'` is emitted before the digest write begins.

Regression scope: REQ-28 and REQ-30 transcribe-site UATs — update assertions to expect a cleared starting state (the existing tests that asserted "the AI's tool calls landed on top of the seeded site" must now assert "the AI's tool calls landed on an empty site").

## OUT

- A "preview vs commit" workflow where convert runs into an ephemeral preview state and the operator promotes to the real draft. Out of scope for now — clean-on-convert is the simpler shape and the Reset button covers the accidental-overwrite case.
- A "convert into a new site" UX where the converted result lands in a separate site record (not the active draft). Multi-site work is deferred.
- A "soft clear" mode that preserves any theme tokens / modules the operator has manually pinned. No pinning mechanism exists yet; not adding one here.

## Dependencies

- [[REQ-28]] — transcribe_site orchestration (this REQ extends its first stage).
- [[REQ-30]] — convert flow rework (the AI reconstruction this REQ's clear precedes).
- [[REQ-33]] — markdown content union (orthogonal but lands first; verbatim copy enforcement works regardless of clear-on-import).

## Acceptance criteria

1. `transcribe_site` against any starting draft state clears the draft to a 1-page empty scaffold before the mirror/digest phase begins.
2. The empty scaffold passes `validateSite` and renders without error (empty home page, default theme).
3. After a successful convert against a populated source, the draft contains only modules / pages / theme tokens the AI produced from the source — no modules / pages / theme tokens carried over from the starting draft.
4. The cleared scaffold's `config.businessName` is populated from the source's site title (digest's `sourceTitle` or page-1 `<title>`).
5. An SSE `transcribe_progress` event with `{ stage: 0, status: 'cleared' }` fires before any digest write, and the TranscribeProgress chat-card surfaces it.
6. `docs/llm-context/reproducing-a-website.md` no longer instructs the AI to consider existing-draft state; it assumes an empty starting scaffold.

## Story points

2. Single action handler change + scaffold builder + SSE event + doc update + ~4 UATs.

## Notes for reconcile

- REQ-28's `test_UAT_FC_REQ-28_transcribe_site_stages.test.ts` currently asserts that the AI's `set_module_content` calls overlay onto the 1stcontact baseline. Those assertions need to flip to "calls onto an empty scaffold."
- REQ-30's killer-demo UAT assertions should pass unchanged — the test fixture exercises the AI reconstruction independently of whether the starting state was populated.


## Implementation notes (session 2026-06-20)

- The Stage 0 clear ships as part of the same `transcribe_site` handler invocation; REQ-35 had already removed the destructive-confirmation gate, so the clear runs immediately on entry to the handler, before any mirror / digest / asset-mirror work.
- The empty-scaffold constructor lives in `packages/builder-ui/src/empty-scaffold.ts` as a reusable `buildEmptyScaffold({ businessName? })` (rather than `clearDraftToEmptyScaffold` inside transcribe-site.ts). This keeps the Site-shape knowledge in the package that already imports `defaultThemeTokens` from `@1stcontact/framework/tokens` and re-uses it for both the server-side action handler and the FE chat-driver's local-store update.
- The "same persistence path used by state_edit actions" maps to two mirroring updates: (a) `chat.ts` sets `workingSite = payload.clearedSiteDefinition` after the transcribe_site system action so subsequent AI turns in the same chat loop reason about the cleared draft; (b) `chat-driver.ts` (the FE driver) reads `clearedSiteDefinition` from the `transcribe_site_done` result and replaces `workingSite` before processing any state_edit tool calls — so the operator's `BuilderStore.setSiteDefinition` lands on the cleared scaffold and the subsequent state_edit calls produced by the AI overlay onto that, not onto the previous draft.
- `titleFromDigest(homeDigest)` supplies the source title; `buildEmptyScaffold` falls back to "Untitled" if the title is empty/missing.
- The transcribe-site.ts changes (Stage 0 emit, `clearedSiteDefinition` in the return payload, `titleFromDigest`/`buildEmptyScaffold` imports) shipped in commit `58fce2b` alongside REQ-35's confirmation-gate removal so the gate could be removed safely. This REQ's commit (`c54359d`) fills in the missing pieces: the `empty-scaffold.ts` module that 58fce2b's import depended on, the chat.ts / chat-driver.ts workingSite mutations, the TranscribeProgress Stage 0 row, the how-to-doc updates, and the UATs.


---

## BUG-10: Convert flow: blank iframe + missing TranscribeProgress card after REQ-34/REQ-35

## What's broken

After REQ-34 + REQ-35 shipped, two issues with the convert flow:

1. **No assets in the chat feed.** The TranscribeProgress chat-card (with the per-stage progress list and the assets-mirrored / failures-to-mirror sub-sections) is not appearing. The operator just sees a plain "transcribe_site ✓" summary fallback card instead.

2. **Blank iframe after conversion.** The preview iframe is empty even after the AI runs the full reconstruction sequence (transcribe_site → read_transcription_digest → set_theme_token → add_module × N). The AI is calling `get_site_definition` and reporting that modules exist (`header-1`, `hero-1`, `text-block-1`, `services-grid-1`, `text-block-2`) but no content is set on any of them, and the iframe is blank.

## Root cause (suspected)

### Issue 1 — TranscribeProgress card not registered

`packages/builder-ui/src/main.ts` calls `registerDigestReport()` but **never calls `registerTranscribeProgress()`**. So in the live SPA, the `transcribe_site_done` tool_result has no registered renderer and falls back to the plain summary card in `tool-result-renderers.ts`.

This is a pre-existing bug (since 0f6d904 introduced TranscribeProgress without wiring `registerTranscribeProgress` into `bootBuilder`). The Stage 0 row REQ-34 added is also invisible in the live app for the same reason — the card it lives on never renders.

### Issue 2 — Module IDs

The AI's how-to (`docs/llm-context/reproducing-a-website.md`) uses canonical example IDs like `hero-1`, `body-1`, `text-1` in its `set_module_content` examples — but it does NOT instruct the AI to pass an explicit `id` to `add_module`. Without an explicit `id`, `applyAddModule` generates a random suffix (`hero-x7q9pz`). The AI's subsequent `set_module_content({ instance_id: "hero-1", ... })` references the wrong ID → silent rejection → modules end up empty → iframe renders empty / mostly blank.

Before REQ-34, the AI's `set_module_content` calls landed on pre-existing modules from the 1stcontact starter (which had stable IDs like `hero`, `services`, `contact`). REQ-34's clear-to-empty-scaffold removes those, exposing the latent how-to gap.

NOTE: the user reports the AI now sees `header-1`, `hero-1`, etc. in the site definition — suggesting the AI may have started passing explicit IDs in its later attempts, but the iframe is still blank. So this hypothesis explains the FIRST failed convert but not necessarily the persistent blank-after-retry state. Needs dev-server verification.

## Verification plan (before code)

1. Boot `wrangler dev`. Run a real convert against an external URL.
2. Open the chat panel; capture each tool-call summary (`accepted` flag + error message for any rejections).
3. Capture the iframe's rendered HTML (via devtools "view source") to see whether modules are present-but-empty or genuinely absent.
4. Confirm whether registering `registerTranscribeProgress()` brings back the assets/failures display.

## Fix sketch

- **Issue 1 (mechanical):** add `registerTranscribeProgress()` to `bootBuilder` in `packages/builder-ui/src/main.ts`. Verify by booting dev and running a convert — TranscribeProgress card with Stage 0..4 + asset list should appear.
- **Issue 2 (instructional + structural):**
  - Update `reproducing-a-website.md` (+ the inlined `llm-context.ts` mirror) to instruct the AI to pass a deterministic `id` to `add_module` (`hero-1`, `text-block-1`, `services-grid-1`) and re-use that id for all subsequent `set_module_content` / `set_module_dial` / `set_module_variant` calls.
  - Consider also making `applyAddModule` return the assigned id in the tool_result payload so the AI can read it back rather than guess (defensive fix; survives operator-written prompts that don't follow the doc).

## Why bug not REQ extension

REQ-34's scope was "clear the draft before AI reconstruction". The clear itself works (tests prove it, the cleared scaffold is valid and is applied to both server workingSite and FE store). What's broken is the downstream AI flow that REQ-34 exposed (issue 2) and a pre-existing wiring gap that REQ-34 made more visible (issue 1). These are distinct from REQ-34's core contract.

## Acceptance criteria

1. After a convert, the chat shows a TranscribeProgress card with all 5 stages (0..4), the mirrored-assets count, and any failures-to-mirror rows.
2. After a convert against a real URL with mirrorable assets, the iframe shows a populated home page (theme tokens applied, modules with content from the digest, hero image visible).
3. Re-running convert against a different URL produces a similarly populated iframe (no contamination from the previous convert — REQ-34's behaviour preserved).
4. New UATs lock in the wiring of `registerTranscribeProgress` and the AI's add_module-with-explicit-id path through mocked Anthropic responses.


---

## Landed (issue 1) — 2026-06-20

Commit `65e79b6` wired `registerTranscribeProgress()` into `bootBuilder` alongside the existing `registerDigestReport()` call (`packages/builder-ui/src/main.ts:8,83`). The `transcribe_site_done` tool_result now routes to the multi-stage progress card (Stage 0..4 + mirrored assets + failures-to-mirror) instead of falling through to the plain summary fallback in `tool-result-renderers.ts`.

Locked in by `tests/test_UAT_FC_BUG-10_bootbuilder_registers_transcribe_progress.test.ts`, which clears the renderer registry, runs `bootBuilder`, and asserts the `transcribe_site_done` dispatcher key resolves — a future refactor that removes the registration call fails loudly rather than silently degrading.

Satisfies acceptance criterion 1 and the portion of criterion 4 covering `registerTranscribeProgress` wiring.

## Deferred (issue 2) — blank iframe / module-ID mismatch

Not addressed by this ticket's commits. Still outstanding:

- `docs/llm-context/reproducing-a-website.md:20` ("walk each page's modules") does not instruct the AI to pass an explicit `id` to `add_module`. The example IDs (`hero-1`, `text-1`, `body-1`) only appear in downstream `set_module_content` calls.
- `applyAddModule` (`packages/builder-ui/src/tools.ts:245-248`) still generates a random suffix when no `id` is supplied, and (`tools.ts:281`) returns only the validator result — the assigned id is not surfaced in the tool_result for the AI to read back.

These need dev-server verification before the doc/structural fix so the actual failure mode is confirmed (the operator's later observation that the AI was already using `hero-1` etc. but the iframe was still blank suggests the explanation is incomplete). Acceptance criteria 2, 3, and the remainder of 4 remain unmet and will be picked up in a follow-up session.


---

## REQ-14: AI tool surface completion: nav editing, page management, duplicate_module

## Scope

Complete the v1 AI tool surface for site editing by adding the missing categories. Originally three groups; the page-CRUD group landed under [[REQ-30]] (multi-page convert demo needed it sooner). Remaining work:

1. **Nav editing** — `set_nav_pattern`, `set_nav_entries`. Promised in [[DOC-8]] §5.1 but never shipped.
2. **Page metadata** — `set_page_metadata` (page-level title / seoMeta updates, optional slug rename). Sibling to REQ-30's add/remove/reorder.
3. **Duplicate-module convenience** — `duplicate_module(instance_id, after_instance_id?)`. Not in §5.1; saves the AI from reconstructing identical module contents.

After this REQ: the AI can drive every operator-level edit available on a single-page or multi-page site without the operator falling back to UI affordances. Parity is restored between what DOC-8 promises and what the API actually exposes.

Design discussion: in-app feedback from Claude running in the builder identified nav editing, page management, and duplicate-module as the top three missing edit primitives. Per [[REQ-9]] parity invariant, AI tool exposure must match what the operator can do — these tools represent the matching API endpoints.

## Why free-coded

Tool surface gap-filling. Architecture is settled (each tool is a state edit applied through the existing dispatch from [[REQ-8]]). No new categories of behaviour — just adding tools to the registry, wiring them through the validator from [[REQ-3]], and updating module instance / page composition logic.

## Dependencies

- [[REQ-3]] — site-schema validator (each new tool's input is validated).
- [[REQ-8]] — tool dispatch path through `/api/chat`.
- [[REQ-9]] — OPERATOR_ACTIONS registry (each new tool is registered here per the parity principle).
- [[REQ-30]] — closed the page-CRUD section (add/remove/reorder_pages); this REQ no longer ships those.

## Page-CRUD scope clarification (post-REQ-30)

`add_page`, `remove_page`, `reorder_pages` are **complete** as of REQ-30 commits `44c637a259abe504282c8bcb50b3994800f5b127` and `1d249b0884d37f0cc8eca955ae9ee98f789c7c50`. REQ-14 inherits only:
- `set_page_metadata` (title / seoMeta / optional slug rename) — REQ-30 did not cover this.

## Deliverables

### Nav editing tools

**`set_nav_pattern(pattern: NavPattern)`**

- Sets `site.nav.pattern`. Allowed values per [[DOC-7]] §5: `'in-page-anchors' | 'top-tabs' | 'top-tabs-dropdown' | 'hamburger' | 'footer-only'`.
- v1 framework supports `in-page-anchors` and `top-tabs` only (per DOC-7 §5 phasing); other values pass validation but warn that rendering may degrade.

**`set_nav_entries(entries: NavEntry[])`**

- Replaces `site.nav.entries` wholesale.
- Each `NavEntry`: `{ label: string, target: NavTarget }` per the existing site-schema discriminated union.
- Validator enforces (NEW in this REQ): every `kind=page` target's `pageId` resolves to an existing page id; every `kind=anchor` target's `pageId`+`moduleId` resolves to an existing module on that page. No duplicate labels at the same level.
- This validation is added to `Site.superRefine` in `packages/site-schema/src/schema.ts` (catches the bad shape wherever it appears, not only via this tool).

### Page metadata tool

**`set_page_metadata(slug: string, updates: { title?: string, new_slug?: string, seoMeta?: SeoMeta })`**

- Identifies the page by its current canonical slug (e.g. `'/'` or `'/menu'`, or bare segment `menu` — same normalization as REQ-30's `after_slug`).
- `title` updates `page.title`.
- `new_slug` renames the page (bare segment, validated against the slug RE). Uniqueness checked against existing pages. `page.id` is left unchanged so nav entries' `pageId` references survive the rename.
- `seoMeta` patches the page's SEO meta object (partial — any field provided overwrites; omitted fields preserved).
- Validator: at least one of `title|new_slug|seoMeta` must be supplied.

### Duplicate-module convenience tool

**`duplicate_module(instance_id: string, after_instance_id?: string)`**

- Deep-clones a module instance: new UUID, identical `type`, `version`, `variant`, `dials`, `content`. Asset references duplicated by reference (same `AssetRef`); no asset copying.
- Inserts after the named instance, or directly after the source instance if not specified.
- Validator: source instance must exist on some page; insertion target (if specified) must exist on the *same* page; new IDs unique.

### Registry entries (`OPERATOR_ACTIONS`)

Each tool registered per REQ-9's pattern with:

```
plan_tier:     'trial'   (state edits; available to all plans)
ui_route:      null      (chat-only in v1)
category:      'state_edit'
```

### UATs (`test_UAT_FC_REQ-14_*`)

**Nav editing:**
- `set_nav_pattern_updates_site` — call sets `site.nav.pattern`; validator accepts allowed enum.
- `set_nav_pattern_rejects_unknown` — call with invalid pattern value rejected with structured error.
- `set_nav_entries_replaces_list` — call replaces nav entries; validator accepts; site reflects new list.
- `set_nav_entries_rejects_orphan_anchor` — entry targeting a non-existent module ID rejected.
- `set_nav_entries_rejects_orphan_page` — entry targeting a non-existent page id rejected.
- `validate_site_rejects_orphan_nav_page` — Site.superRefine itself rejects, not just the tool.

**Page metadata:**
- `set_page_metadata_updates_title_and_seo` — title and SEO fields update; validator accepts.
- `set_page_metadata_renames_slug` — `new_slug` renames; nav entries pointing at the page (by id) still resolve.
- `set_page_metadata_rejects_slug_collision` — renaming to an existing slug rejected.
- `set_page_metadata_rejects_invalid_slug` — bad slug format rejected.

**Duplicate module:**
- `duplicate_module_clones_content_and_dials` — duplicated instance has identical type/version/variant/dials/content but new UUID.
- `duplicate_module_inserts_after_source_by_default` — without `after_instance_id`, new instance lands immediately after source.
- `duplicate_module_rejects_cross_page_target` — `after_instance_id` referring to an instance on a different page rejected.

## Out of scope

- UI affordances for any of these tools (chat-only in v1; future REQ may add per-page UI controls or sites-nav editor).
- Bulk operations (add multiple modules in one call, etc.) — single-instance only in v1.
- Move-module-across-pages — not in this REQ; AI can `duplicate_module` + `remove_module` if needed.
- Asset copying when duplicating a module — refs duplicated by reference; asset CRUD is a separate REQ.
- Path changes (REQ-14 original spec mentioned `path` updates in `set_page_metadata`; `slug` IS the path in this schema, so renaming `slug` is the path-change mechanism — no separate `path` field).

## Risks / open items

- **Validator-coupling churn** — each tool needs validator support for its input shape. The nav cross-ref check is added to `Site.superRefine` (one place, broad coverage). Existing `remove_page` (from REQ-30) currently strips orphan nav entries eagerly; with the new validator that eager strip becomes redundant but harmless — leave it.
- **Concurrency with revisions** — page renaming during an active publish could create a snapshot inconsistency. Handled by REQ-11's snapshot-at-handler-entry semantic.
- **Tool list size** — adding 4 tools to OPERATOR_ACTIONS plus the existing set approaches double-digit count. Token cost in system prompt is acceptable; monitor.