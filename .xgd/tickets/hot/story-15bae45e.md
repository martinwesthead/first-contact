---
uid: story-15bae45e
id: STORY-56
type: story
title: Analyze a reference URL into an interactive Digest Report in the builder chat
created_by: xgd
created_at: '2026-06-27T01:25:03.197100+00:00'
updated_at: '2026-06-30T06:10:18.289576+00:00'
completed_at: null
last_field_updated: story_kind
status: reconciling
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-9395ee51
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-24c4d23c
---

## Story

**As an** operator building a site in the builder, **I want** to paste a reference website's URL into the chat and have the assistant analyze it into a Reference Digest rendered as an interactive card — rendering the page in a real browser with screenshots by default — **so that** I can review the site's design signals, see how it actually looks, and decide whether to reproduce it.

## Description

This story covers the operator-facing **analyze action** that turns a pasted URL into a Reference Digest, and the **Digest Report card** that renders the result in the chat panel. It ties together the Operator API (CAP-43), the External Fetch Safety contract (CAP-44), the chat tool-result rendering surface (CAP-38 / STORY-46), and the Reference Digest extractors and schema (CAP-46, sibling story [[story-3f73931a]]).

The action runs the static-fetch path to establish baseline signals, then **runs the Browser-Rendering (rendered) path on every call** — there is no escalation heuristic and no operator force toggle. The rendered path produces computed-CSS signals, three-viewport screenshots in R2, and feeds the desktop screenshot to the AI commentary pass as an image. The static path is the **degraded fallback**, used only when the `BROWSER` binding is unavailable, the per-session Browser-Rendering budget is exhausted, or the rendered driver throws. The card surfaces the screenshots as a strip above the digest body.

**In scope:**
- The `analyze_page` system action: an authorized, plan-tier-gated operator action that fetches a URL through the safety layer, runs the deterministic extractors, **runs the rendered path unconditionally**, runs an AI commentary pass, caches the result, and returns a structured `reference_digest` tool_result carrying `fetchPath` and `screenshotKeys`.
- **Render-by-default wiring**: on every call the action runs `browser-budget gate → rendered driver → computed-signal merge → R2 screenshot upload`, marking the digest `fetchPath: 'rendered'`, merging computed typography/palette/background-image signals over the static ones, and populating `digest.screenshotKeys` (mobile/tablet/desktop). This applies identically whether the page is static-rich or a JS-SPA.
- **Degraded static fallback**: when the rendered path cannot run (the `BROWSER` binding is missing, the Browser-Rendering budget is exhausted, the rendered driver throws, or a screenshot upload fails), the action degrades to the static path, marks the digest `fetchPath: 'static'`, appends a `whatsMissing` entry citing the cause, and still returns a successful result (it does NOT return a failure).
- **Multimodal AI commentary**: when a desktop screenshot is available, the Haiku 4.5 commentary call includes it as an image content block and the prompt asks the model to comment on visual properties (alignment, density, hero/imagery treatment, layout rhythm) in addition to the signal bullets; the deterministic fallback still applies when no model key is configured or the call fails.
- Operator-intent gating: analysis only proceeds when the operator's most recent chat message implies fetch intent, or a fresh session-bound intent token is supplied.
- A 24-hour digest cache keyed on the URL + schema version, so a repeat analysis returns the prior digest without re-fetching, re-rendering, or re-running commentary.
- Propagation of every fetch-safety failure as a typed error on the action's failure branch — no safety failure surfaces as an uncaught exception.
- The generalized kind-tagged tool_result surfacing rule: any system action whose result carries a `kind` discriminator surfaces its data + kind in the chat response's tool calls so the front-end dispatcher can route it; the legacy no-kind read tool path is preserved.
- The Digest Report card UI: an info-toned card headed by the source URL, a **mobile/tablet/desktop screenshot strip rendered as the first body element when `screenshotKeys` are present** (images resolved via `/assets/{key}`), the digest markdown body, an asset-inventory sub-section with per-kind counts and thumbnails, and "Convert this site" / "Discard" actions.

**Out of scope (other stories / REQs):**
- The Reference Digest schema, signal extractors, rendered-fetch driver, computed-CSS extraction, and screenshot upload — sibling story [[story-3f73931a]] (CAP-46). This story consumes those primitives; it does not implement them.
- Layer B transcription that "Convert this site" eventually triggers — REQ-28 (this story only emits the request event).
- Multi-page crawl / sitemap discovery — REQ-29.
- Persisting the digest (and its R2 screenshots) beyond the in-memory chat session — deferred (REQ-23/24); R2 screenshot cleanup is manual for the demo.

## Technical Context

- Action implemented as a `system_action` in the Operator API registry (CAP-43), `plan_tier='trial'`, `ui_route=null`, dispatched both through `/api/chat` (which threads the operator's latest message and mints intent tokens) and the direct `/api/operator/analyze_page` POST route (which passes a null operator message, requiring an explicit intent token). The tool's `input_schema` exposes only `url` (required) and an optional `intentToken`. There is **no** `forceRendered` parameter — rendering is unconditional, so a force toggle is unnecessary.
- Safety primitives consumed from CAP-44 (External Fetch Safety): `safeFetch`, `checkRateLimit`, `RobotsTxtCache`, `verifyIntentToken`, `operatorMessageImpliesIntent`, plus the Browser-Rendering budget gate (`checkBrowserBudget` / `chargeBrowserBudget`). The 1h per-URL response cache and the 24h digest cache both live in `FETCH_CACHE_KV`.
- Rendered path consumes the extractor primitives from [[story-3f73931a]] — `renderedFetch` (via an injected `@cloudflare/puppeteer` driver), `mergeComputedSignals`, `uploadScreenshots`. There is no `shouldEscalateToRendered` decision: the analyze action invokes the rendered driver directly on every call. Screenshots are written to `ASSETS_BUCKET` under the `references/{chatId}/{turnId}/{viewport}.png` layout and surfaced to the card via `/assets/{key}`.
- The `BROWSER` binding is scoped to `[env.production]` (and proxied locally via a top-level `[browser] remote=true` block); when `env.BROWSER` is absent the handler treats it as a binding-unavailable fallback and degrades to the static path.
- AI commentary uses model `claude-haiku-4-5-20251001`; on missing `CLAUDE_API_KEY`, a non-2xx response, or unparseable output it falls back to a deterministic summary + the baseline what's-missing list derived from the signals. When a desktop screenshot key is present it is fetched from `ASSETS_BUCKET` and attached as a base64 `image/png` content block.
- Digest cache key = `sha256(url|schemaVersion)`, TTL 24h.
- The card renderer registers with the tool-result dispatcher (CAP-38) under `kind='reference_digest'` and renders the digest markdown via the shared marked + DOMPurify pipeline.
- **Reconciliation note (render-by-default is now ground truth):** earlier reconciliations of this story deferred the render-by-default amendment (then attributed to REQ-49) and treated the escalation heuristic as ground truth. BUNDLE-10 (REQ-53, commit 72effe61) reconciles that amendment: the rendered path now runs unconditionally, `forceRendered` was removed from the input schema, and `packages/extractor/src/escalate.ts` / `shouldEscalateToRendered` were deleted. The escalation-decision ACs (former AC-597 / AC-610 / AC-611) are archived.
- **Divergence note for regression:** if `FETCH_CACHE_KV` / `FETCH_ROBOTS_KV` bindings are absent the action fails fast with a configuration error rather than degrading; this is a deployment precondition, not an operator-visible safety failure.

## Dependencies

Plan items 1 (Operator API / CAP-43), 3 (External Fetch Safety / CAP-44, incl. Browser-Rendering budget), 5 (chat tool-result surface / STORY-46), 6 (Reference Digest extractors + rendered-path primitives / [[story-3f73931a]]).

## Story Points

3
