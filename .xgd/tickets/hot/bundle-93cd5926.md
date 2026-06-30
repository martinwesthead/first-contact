---
uid: bundle-93cd5926
id: BUNDLE-10
type: bundle
title: REQ-53 + REQ-51 + BUG-15 + BUG-17
created_by: xgd
created_at: '2026-06-30T05:59:25.137245+00:00'
updated_at: '2026-06-30T07:09:05.291815+00:00'
completed_at: '2026-06-30T07:09:03.104591+00:00'
last_field_updated: result
status: free_and_reconciled
fields:
  commits:
  - f33540b88d99b9a2441bafeca370767c9c996a6f
  auto_merge_back: true
  priority: medium
  merged_at_commit: f33540b88d99b9a2441bafeca370767c9c996a6f
result: pass
---

# Bundle

This ticket bundles the following source tickets:


---

## REQ-53: [split from REQ-22] straggler commits

Auto-split from REQ-22 (Browser Rendering integration: JS-rendered fetch path with screenshots and computed-CSS signals).
These commits were separated from the main cluster by a large git-position gap.

## Commits

- 72effe61 feat(extractor,control-app): analyze_page renders by default [FREE-CODED]


---

## REQ-51: AI closed-loop preview: render generated draft pages so the AI can see its own work

## Problem

The AI generates HTML/CSS for the customer's site via the builder tool surface ([[REQ-8]] / [[REQ-14]] / [[REQ-30]] / the module set [[REQ-39]]…[[REQ-44]]) but cannot **see** the rendered result. [[REQ-21]] and [[REQ-22]] give it full visual fidelity on competitor pages — screenshots, computed CSS, layout signals — and then it ships its own output into the void.

Any reasoning of the form:
- "Does my generated hero match the inspiration?"
- "Is the alignment off?"
- "Did the theme tokens land the way I expected?"
- "Are the modules I picked actually rendering the layout density the brief asked for?"

is impossible. The AI designs blind, then routes verification through the human operator ("does this look right to you?") even when it could answer itself.

This is the missing closed loop. Without it the reconstruction quality from [[REQ-28]] (Layer B transcription) and [[REQ-30]] (convert flow rework) is unverifiable by the AI itself — the very capability that makes the convert demo land for an operator (the screenshot strip from [[REQ-22]]) is one-directional today.

## Origin

Surfaced in chat on 2026-06-24 while discussing [[REQ-22]]'s render-by-default amendment:

> "The render has to be applicable to the page the AI creates so it can see that too."
> — operator, 2026-06-24

Agreed in the same exchange; this REQ is the result. The companion change is the [[REQ-22]] Amendment 2026-06-24 (render-by-default for external pages).

## Scope

Add `preview_generated_page` — a sibling to `analyze_page` ([[REQ-21]] / [[REQ-22]]) that runs the SAME `renderedFetch` + `mergeComputedSignals` + screenshot-upload pipeline against the builder's current draft preview URL, returning the same digest shape the AI already knows how to reason over.

### Tool surface

```
preview_generated_page({
  pageId?: string,              // defaults to active page in draft
  compareToDigestId?: string,   // cached ReferenceDigest URL to diff against
}) → {
  kind: 'preview_digest',
  digest: PreviewDigest,        // ReferenceDigest shape + previewSource field
  digestMarkdown: string,
  inspirationDelta?: string,    // present iff compareToDigestId resolves
}
```

- Resolves the draft preview URL from the existing in-browser preview infra ([[REQ-8]] / [[REQ-12]] / [[REQ-31]]).
- Reuses the [[REQ-22]] pipeline end-to-end. No new Browser Rendering wiring.
- Multimodal commentary: same Haiku 4.5 image-input pattern. When `compareToDigestId` resolves, the prompt feeds **two** images (preview + reference) and asks for explicit deltas in `inspirationDelta` ("hero is left-aligned in your generated page, centered in inspiration — adjust X by Y").

## IN

### `packages/extractor` additions

- `renderPreviewDigest(env, { previewUrl, pageId })` — wraps `renderedFetch` + `mergeComputedSignals` against a builder-internal preview URL. Returns the same `ReferenceDigest` shape with `fetchPath: 'rendered'`. Screenshots uploaded to `previews/{accountId}/{draftId}/{pageId}/{viewport}.png` (distinct prefix from `references/` so chat-deletion sweeps can scope correctly).
- `PreviewDigest` type — extends `ReferenceDigest` with `previewSource: { accountId, draftId, pageId, capturedAt }`.

### `apps/control-app` wiring

- Register `preview_generated_page` in the operator action registry. Same budget gate from [[REQ-20]] as `analyze_page`.
- Tool description in the AI surface emphasises the self-inspection use case: "Render the current draft page and return what it looks like — use this to check your own work against an inspiration digest, to verify a module change landed visually, or to answer 'what does this page look like right now?'"
- Resolves the preview URL via the same in-browser preview surface the operator already sees in the builder.

### Builder UI

- `<PreviewDigestReport>` chat-card variant — mirror of `<DigestReport>` from [[REQ-22]]. Renders the AI's own page as the AI sees it; screenshot strip at the top, computed-signal panels below.
- When `inspirationDelta` is present, the card includes a "vs. inspiration" section quoting the delta paragraph.

### Multimodal commentary upgrade

When `compareToDigestId` resolves to a cached `ReferenceDigest`, the Haiku 4.5 call gets BOTH the desktop preview screenshot AND the desktop reference screenshot (when available), with a prompt that explicitly asks the AI to enumerate visual deltas — alignment, density, hero treatment, typography weight, palette warmth. Result lands in `inspirationDelta` as 2–4 sentences.

## OUT (explicitly deferred)

- Side-by-side visual diff rendering (overlay, alpha-blend) — text deltas are sufficient v1.
- Automatic correction loop ("if delta > threshold, fix and re-render") — operator initiates fixes; no auto-loop.
- Publish gating on visual divergence — operator judgment, not a hard gate.
- Per-element pixel diffing — semantic deltas only.
- Mobile / tablet delta commentary — desktop only in v1 (mobile + tablet screenshots are still captured and returned for the operator's view).
- Caching of `PreviewDigest` — draft state changes on every operator turn; caching would routinely return stale.

## Dependencies

- [[REQ-22]] — rendered fetch pipeline, screenshot upload, multimodal commentary. The amendment to render-by-default lands before this REQ ships so `compareToDigestId` reliably points at a rendered reference.
- [[REQ-20]] — budget gate, ASSETS_BUCKET, safety contract.
- [[REQ-8]] / [[REQ-12]] / [[REQ-31]] — builder draft state and preview URL surface.
- [[REQ-21]] — `ReferenceDigest` schema (extended here, not replaced).

## Acceptance criteria

1. `preview_generated_page` with no `pageId` returns a `PreviewDigest` for the active page with all three viewport screenshots populated (mobile / tablet / desktop), each persisted to the `previews/{accountId}/...` prefix.
2. The returned digest's `previewSource` carries the correct `accountId`, `draftId`, `pageId`, and ISO `capturedAt`.
3. With `compareToDigestId` pointing at a cached `ReferenceDigest` (rendered), the response includes a non-empty `inspirationDelta` string. The string contains at least one explicit comparison phrase (`aligned`, `centered`, `denser`, `lighter`, `warmer`, etc.) — verified by pattern matching, not just length.
4. With `compareToDigestId` pointing at an unknown/unresolvable digest ID, the tool returns the preview digest with `inspirationDelta: undefined` and a `whatsMissing` entry — no error.
5. Budget-exhaustion behaves identically to `analyze_page`: the call succeeds with no screenshots and a `whatsMissing` entry citing the exhausted budget.
6. Builder `<PreviewDigestReport>` chat-card renders the screenshot strip at the top of the card body and, when `inspirationDelta` is set, a "vs. inspiration" section showing the delta paragraph.
7. UAT: operator types "show me what you made" (or equivalent) → AI calls `preview_generated_page` with `compareToDigestId` set to the most recent reference digest in chat context → ChatCard renders with screenshots, computed-signal panels, and a delta paragraph. Total wall-clock under 30 seconds (parity with `analyze_page` on the same content).
8. UAT: with no reference digest in chat context, the same operator prompt produces a `PreviewDigest` chat-card with screenshots and signal panels but no "vs. inspiration" section — the AI's chat reply notes that no reference is loaded.

## Story points

5. Tool registration + `renderPreviewDigest` wrapper + `<PreviewDigestReport>` chat-card + multimodal two-image delta prompt + preview-URL resolver against the builder's existing preview infra. Smaller than [[REQ-22]] because the rendering pipeline, signal extraction, and screenshot upload are reused unchanged.



## What shipped (free-coding cycle, 2026-06-24)

Implementation matches the scope above. The notable choices the reconciler should see:

1. **Preview URL is server-rendered HTML uploaded to R2**, not the operator-facing
   builder iframe. The handler imports `@gendev/framework`'s `renderSiteToHtml`
   (the same renderer the in-browser preview uses, per DOC-7 §2.4), writes the
   HTML to `previews/{accountId}/{draftId}/{pageId}/page.html` in ASSETS_BUCKET,
   then asks the Browser Rendering binding to navigate to
   `{requestOrigin}/assets/{key}`. This keeps the cut-from-reality identical to
   what the in-browser preview produces while reusing REQ-22's puppeteer wiring
   end-to-end. No new Browser Rendering surface.

2. **`draftId` is content-addressed** — the first 16 hex chars of the rendered
   HTML's SHA-256. Same draft state → same draftId (R2 keys are stable across
   identical-state calls); any change to the rendered HTML → new draftId.
   Tested by UAT in `test_UAT_FC_REQ-51_preview_generated_page.test.ts`.

3. **`ActionContext` gained `requestOrigin: string | null`** (`apps/control-app/src/operator/registry.ts`).
   Populated by the chat handler from `request.url` and by the
   `/api/operator/<action>` router. The preview handler uses it to build the
   absolute `/assets` URL the Browser Rendering binding navigates to.
   Existing handlers do not consume the field.

4. **`uploadScreenshots()` accepts either `{ chatId, turnId }` or `{ pathPrefix }`**
   so the new `previews/...` prefix family reuses the existing helper instead
   of cloning it. The original two-arg shape is preserved for back-compat;
   every existing caller still works unchanged.

5. **Multimodal commentary** uses Haiku 4.5 (the same model as `analyze_page`).
   When `compareToDigestId` resolves AND both desktop screenshots are present,
   the call receives both images and the system prompt explicitly requires at
   least one comparison phrase from `aligned/centered/left/denser/sparser/lighter/heavier/warmer/cooler/tighter/looser`
   in the inspirationDelta — tested by pattern match in AC3.

## Files touched

**New**
- `packages/extractor/src/preview-digest.ts` — `renderPreviewDigest()` wrapper +
  `buildPreviewPrefix()` + `parsePreviewDigest/parseReferenceDigest` helpers
- `apps/control-app/src/operator/preview-generated-page.ts` — operator handler
- `packages/builder-ui/src/components/preview-digest-report.ts` — `<PreviewDigestReport>` chat-card
- `tests/_helpers_REQ-51_preview.ts` — fake-driver + harness helpers
- `tests/test_UAT_FC_REQ-51_preview_generated_page.test.ts` (7 UATs)
- `tests/test_UAT_FC_REQ-51_preview_digest_report.test.ts` (4 UATs)
- `tests/test_UAT_FC_REQ-51_tool_registered.test.ts` (3 UATs)

**Modified**
- `packages/extractor/src/schema.ts` — adds `PreviewDigest` + `PreviewSource` Zod schemas
- `packages/extractor/src/index.ts` — re-exports for the new types/helpers
- `packages/extractor/src/upload-screenshots.ts` — `UploadScreenshotsArgs` discriminated union
- `apps/control-app/src/operator/registry.ts` — adds `requestOrigin` to `ActionContext` + registers `preview_generated_page` system_action
- `apps/control-app/src/chat.ts` — populates `requestOrigin` for handler context
- `apps/control-app/src/operator/router.ts` — populates `requestOrigin` for direct-route context
- `apps/control-app/package.json` — adds `@gendev/framework` + `@gendev/site-schema` workspace deps
- `packages/builder-ui/src/index.ts` — re-exports `registerPreviewDigestReport`
- `packages/builder-ui/src/main.ts` — calls `registerPreviewDigestReport()` at boot
- `tests/_helpers_REQ-21_analyze_page.ts`, `tests/_helpers_REQ-22_rendered.ts`,
  `tests/_helpers_REQ-28_transcribe_site.ts`, and four REQ-46/REQ-33 tests —
  thread the new required `requestOrigin` field through their `ActionContext`
  literals (back-compat only; no behavior change).

## Test results

`pnpm exec vitest run`: 698 tests, all passing. 14 new tests in 3 files cover ACs 1–8.



## Amendment 2026-06-24 — degraded-mode signals (commit 1ece0cc)

**Problem found in dogfooding**: the first pass returned a digest with all
signals as `not_detected` whenever BROWSER was missing or budget exhausted,
so the chat card rendered as essentially empty ("Preview — home" + a single
`#` from `renderDigestMarkdown` on an all-empty `Signals` shape). Locally
(without `wrangler dev --remote`) BROWSER is never bound, so the tool was
useless during local development even on drafts with real content.

**Fix**: the handler already has the in-memory rendered HTML it just uploaded
to R2 for the browser to navigate to. On the degraded path, run
`extractSignals(html, previewUrl)` over that HTML so the digest surfaces the
structural picture the static extractors can produce — headings, nav links,
asset inventory, section counts — even when visual capture is unavailable.

Concrete behaviour:
- `fetchPath` is now `'static'` on the degraded path (was `'rendered'` with
  empty signals). Consumers can tell at a glance this is a degraded digest.
- `whatsMissing[0]` is the degradation reason (`"BROWSER binding not
  configured for this environment."` or `"Browser Rendering budget exhausted
  …"`). Remaining entries are the usual `deriveWhatsMissing(signals)` output.
- `summary` reads `"Preview of draft page '{pageId}' (visual capture
  unavailable; structural signals only): N headings, N sections, N assets."`

**Coverage**: new UAT in `test_UAT_FC_REQ-51_preview_generated_page.test.ts`
asserts that a draft with content modules produces a digest whose
`signals.content.headings` contains the draft's actual headings, with
`fetchPath: 'static'`, no screenshots, and the BROWSER-binding note at the
top of `whatsMissing`. Existing AC5 (budget-exhausted) still passes — it
only required undefined screenshot keys + a budget-related note, both still true.



## Amendment 2026-06-24 — wrangler.toml top-level BROWSER binding (commit 93a59eb)

**Problem found in dogfooding (continued)**: even after the degraded-mode
fix, the BROWSER binding was unreachable from local `pnpm dev`. The previous
`wrangler.toml` only declared BROWSER under `[env.production.browser]`, so
plain `wrangler dev --port 8788` left `env.BROWSER` undefined and both
analyze_page and preview_generated_page degraded forever during local dev.

Falling back to `wrangler dev --remote --env production` failed because the
production-env KV/D1 IDs are still literal `"placeholder_*"` strings (the
worker has never been fully deployed). Cloudflare's edge-preview rejects
the deploy with `KV namespace 'placeholder_browser_budget_kv' is not valid`.

**Fix**: use Wrangler's per-binding remote feature. Add a top-level
`[browser]` block with `binding = "BROWSER"` and `remote = true`. This
proxies ONLY BROWSER calls to real Cloudflare while KV / R2 / D1 stay in
Miniflare. No need to provision real CF KV/D1 IDs just to test Browser
Rendering locally.

After this change: `cd apps/control-app && pnpm dev` exercises the rendered
fetch path for both analyze_page and preview_generated_page. Browser-second
charges hit the configured CF account; the REQ-20 per-session budget cap
(50s) still applies.



## Amendment 2026-06-24 — static-import @cloudflare/puppeteer (commit 61e805e)

**Problem found in dogfooding (continued, third pass)**: with the BROWSER
binding now reachable (previous amendment), preview_generated_page got
further but failed with `No such module "@cloudflare/puppeteer"` at request
time. The package WAS installed in node_modules — but the
`apps/control-app/src/operator/browser-driver.ts` `makePuppeteerDriver`
helper used a deliberately-opaque `await import(modSpecifier)` pattern to
keep Vite/esbuild from pre-resolving puppeteer at test build time. That
same opacity also kept Wrangler's bundler from including puppeteer in the
worker bundle, so the runtime had nothing to resolve.

**Fix**: replace the dynamic indirection with a plain top-of-file
`import puppeteer from "@cloudflare/puppeteer"`. Wrangler picks up the
static import and bundles the package. Tests stay green because
`setDriverFactoryForTest` is called before any handler invocation, so
`makePuppeteerDriver` never runs in test paths, and puppeteer's entry
module has no module-load side effects (verified by jsdom suite passing
all 699 tests after the change).

The local `PuppeteerModule` ambient shim is no longer needed and was deleted.



## Amendment 2026-06-24 — data: URL navigation + session-attach retry (commit 3dcf349)

**Two failures surfaced once the rendered path could finally launch:**

### 1. Localhost-unreachable

Cloudflare's Browser Rendering binding runs in the CF cloud, not on the
operator's machine. The handler was uploading rendered HTML to R2 and
pointing the browser at `{requestOrigin}/assets/{key}` — CF couldn't
resolve the localhost origin and screenshotted a "localhost is blocked"
interstitial. Even in production this added a network round-trip when we
already had the bytes in memory.

**Fix**: skip the R2 HTML upload, pass the rendered HTML to puppeteer via
a `data:text/html;base64,...` URL. `sourceUrl` becomes a synthetic
`preview://{accountId}/{draftId}/{pageId}` identifier so the chat card has
a stable, human-readable handle (a data: URL is unusable for display).

`renderPreviewDigest` signature changed: instead of a single `previewUrl`,
it now takes `navigationUrl` (what puppeteer goes to) and `sourceUrl`
(what the digest records). Internal-only change — the only caller is the
handler, which now passes a data URL + a `preview://` URL respectively.

### 2. Session-attach race

CF's puppeteer wrapper reuses browser sessions for efficiency. Attaching
to a session that's still warming up surfaces as
`"Unable to connect to existing session <id> ... TypeError: Cannot read
properties of null (reading 'accept')"`. Their own error message says
"retry or launch a new browser".

**Fix**: new `launchWithRetry()` in `browser-driver.ts` pattern-matches on
the specific error class (`Unable to connect to existing session` or
`reading 'accept'`) and retries `puppeteer.launch()` exactly once. A
second consecutive failure bubbles to the handler.

### Coverage

- New UAT asserts `digest.sourceUrl` uses the `preview://` scheme (never
  http/https/data — those would be confusing in the chat card).
- New UAT asserts the URL the driver actually navigates to is a
  `data:text/html;charset=utf-8;base64,...` URL whose decoded content
  includes the draft's headings (proves the rendered HTML reaches the
  browser without a network hop).
- Full vitest suite: 701/701.


---

## BUG-15: Preview screenshots don't render /assets/ images — breaks hero bg-image and service card photos

When preview_generated_page renders a screenshot, images stored at /assets/sites/anonymous/imports/... are not loading. The hero module uses variant bg-image with a valid assetRef (id: sites/anonymous/imports/17cfe3cb0fe61c5b.jpg, src: /assets/sites/anonymous/imports/17cfe3cb0fe61c5b.jpg) but the screenshot shows no background image — just the inverse surface colour. Service card images in services-grid are also missing. The preview digest flags 'no hero image inferred' even though the content field is correctly populated.

This makes the preview comparison tool useless for image-heavy sites because:
1. The hero bg-image variant is visually indistinguishable from bg-color in screenshots
2. The inspirationDelta comparison cannot detect image-related differences
3. Operators cannot verify photo placement visually before publishing

## Root cause

`preview-generated-page.ts` wraps the rendered HTML in a `data:text/html;...;base64,...` URL and hands that to Cloudflare's Browser Rendering binding. A data URL has no origin, so `/assets/<key>` references inside the HTML — emitted by the hero `bg-image` variant, by `services-grid` item images, and by header/footer logos — cannot be resolved by the headless browser and 404 silently. The screenshot has no images; the visual signals downstream (palette background, imagery counts) reflect the bare background colour, not the intended image.

The data-URL approach itself is correct (it sidesteps the wrangler-dev problem where the CF-cloud browser cannot reach the operator's localhost) — what's missing is that local R2-backed assets must be inlined into the HTML before it becomes the data URL.

## Fix

In `preview-generated-page.ts`, after `renderSiteToHtml` and before `htmlToDataUrl`, scan the rendered HTML for `/assets/<key>` references in both `src="..."` attributes and CSS `url(...)` expressions. For each unique key, fetch the bytes and content type from `ASSETS_BUCKET` (R2) and rewrite the reference to `data:<contentType>;base64,<bytes>`. Each key is fetched once and shared across all references. Missing keys preserve the original src (don't silently destroy information — the operator can still spot a broken link).

The inlined HTML is what the browser sees; the un-inlined HTML still drives `draftId` so content-addressing remains stable regardless of asset availability.

This only affects the preview path; production rendering (`tools/generate`) serves images via Cloudflare static assets normally.

## Steps to reproduce (pre-fix)

1. Run transcribe_site on any image-heavy site
2. Call preview_generated_page
3. Observe: hero background image absent, service card images absent despite valid assetRef objects in site definition

## Test plan

UATs in `tests/test_UAT_FC_BUG-15_*.test.ts`:

- AC1: hero `bg-image` variant with an `/assets/<key>` src — after rendering through `previewGeneratedPageHandler`, the URL passed to the browser driver decodes to HTML whose hero `<img>` `src="data:image/...;base64,..."` matches the bytes stored in R2.
- AC2: services-grid item images and header logo references are inlined identically.
- AC3: when an `/assets/<key>` reference points at an R2 key that does not exist, the original `src="/assets/<key>"` is preserved (graceful degradation; no crash, no silent dropping of the page).
- AC4: no `/assets/` references appear in `src` attributes that have valid R2 backings — i.e. the inliner is exhaustive across all such references in one render.


---

## BUG-17: Browser Rendering: raise default budget to effectively infinite

## Symptom

`analyze_page`, `transcribe_site`, and `preview_generated_page` repeatedly
fail in testing with:

  "Visual signals unavailable — Browser Rendering budget exhausted
   (session) for this session."

The cap (50 browser-seconds per session, 200 per day) trips during
normal test/dev flows where one session_id accumulates seconds across
many calls, leaving only static signals with no screenshots.

## Root cause

`packages/web-fetch-safety/src/browser-budget.ts` exports a hard-coded
DEFAULT_BROWSER_BUDGET = { sessionMaxSeconds: 50, dayMaxSeconds: 200 }.
The three operator handlers (analyze-page, transcribe-site,
preview-generated-page) call checkBrowserBudget / chargeBrowserBudget
without passing any `config` override, so they always use those defaults.

## Fix

Raise the two default constants to 1_000_000_000 each so the cap is
effectively infinite for production callers. The budget infrastructure
(KV counters, config override plumbing, BROWSER_BUDGET_KV binding) stays
intact — a future re-tightening is a one-constant edit or a per-call
`config: { sessionMaxSeconds: N, dayMaxSeconds: M }` override.

Rate limiting via FETCH_RATE_KV (separate mechanism) remains the
runaway-cost safety net.

## Test plan

- New UAT: tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts
  - Charge a large costSeconds (e.g. 100_000) against a fresh session with
    no config override; assert the result is { ok: true } and the cap
    constants are ≥ 1e9.
- Update tests/test_UAT_FC_REQ-20_browser_budget.test.ts to pass an
  explicit small `config` to checkBrowserBudget / chargeBrowserBudget so
  the cap mechanism is still exercised — without coupling the test to
  the (now-huge) default values.

## Files

- packages/web-fetch-safety/src/browser-budget.ts (constant bump)
- tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts (new)
- tests/test_UAT_FC_REQ-20_browser_budget.test.ts (update to pass explicit config)


## Outcome (as shipped)

Commits:
- ed5168a3 — defaults bump + 3 test updates + new BUG-17 UAT
- 313216d7 — version bump 0.0.38 → 0.0.39

Files changed:
- packages/web-fetch-safety/src/browser-budget.ts (defaults raised to 1_000_000_000)
- tests/test_UAT_FC_REQ-20_browser_budget.test.ts (charge calls now pass an explicit config: { sessionMaxSeconds: 50, dayMaxSeconds: 200 } so the cap mechanism is still exercised under tight values; default-constant assertion updated to >= 1e9)
- tests/test_UAT_FC_REQ-22_budget_exhausted_fallback.test.ts (operator handler doesn't accept a config override, so instead of burning 10×5s the test now seeds the session KV counter directly with spentSeconds = DEFAULT_BROWSER_BUDGET.sessionMaxSeconds to trip the exhausted-fallback path)
- tests/test_UAT_FC_REQ-51_preview_generated_page.test.ts (same KV-seed treatment for AC5's budget-exhausted parity test)
- tests/test_UAT_FC_BUG-17_browser_budget_effectively_infinite.test.ts (new — 3 ITs covering: defaults are >= 1e9; a 100_000s charge against a fresh session is accepted; 100 × 1_000s charges still leave checkBrowserBudget reporting ok)
- package.json (0.0.38 → 0.0.39)

Verification:
- pnpm vitest run on the 4 affected test files: 15/15 pass.
- xgd quality run --lint-only / --build-only: both SUCCESS.
- xgd quality run with --test-filter-expression reports SUCCESS but vacuous (the project's quality.yaml has test_dirs set to a plugin id rather than a directory pattern, so vitest reports "no test files found"; preexisting condition, not introduced by this fix).