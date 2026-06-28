---
uid: story-15bae45e
id: STORY-56
type: story
title: Analyze a reference URL into an interactive Digest Report in the builder chat
created_by: xgd
created_at: '2026-06-27T01:25:03.197100+00:00'
updated_at: '2026-06-28T19:58:47.504362+00:00'
completed_at: null
last_field_updated: updated_by
status: updated
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-9395ee51
  story_kind: upgrade
  story_points: 3
  updated_by:
  - bundle-24c4d23c
---

## Story

**As an** operator building a site in the builder, **I want** to paste a reference website's URL into the chat and have the assistant analyze it into a Reference Digest rendered as an interactive card — escalating to a real browser render with screenshots when the page needs it — **so that** I can review the site's design signals, see how it actually looks, and decide whether to reproduce it.

## Description

This story covers the operator-facing **analyze action** that turns a pasted URL into a Reference Digest, and the **Digest Report card** that renders the result in the chat panel. It ties together the Operator API (CAP-43), the External Fetch Safety contract (CAP-44), the chat tool-result rendering surface (CAP-38 / STORY-46), and the Reference Digest extractors and schema (CAP-46, sibling story [[story-3f73931a]]).

The action runs the static-fetch path first, then **escalates to the Browser-Rendering (rendered) path** when the static signals are too thin (per the escalation heuristic owned by [[story-3f73931a]]) or when the operator forces it. The rendered path produces computed-CSS signals, three-viewport screenshots in R2, and feeds the desktop screenshot to the AI commentary pass as an image. The card surfaces those screenshots as a strip above the digest body.

**In scope:**
- The `analyze_page` system action: an authorized, plan-tier-gated operator action that fetches a URL through the safety layer, runs the deterministic extractors, optionally escalates to the rendered path, runs an AI commentary pass, caches the result, and returns a structured `reference_digest` tool_result carrying `fetchPath` and `screenshotKeys`.
- An optional `forceRendered` tool-input parameter that forces Browser-Rendering escalation even when the static signals would have sufficed.
- **Rendered-path wiring**: when escalation fires, the action runs `escalation → browser-budget gate → rendered driver → computed-signal merge → R2 screenshot upload → digest`, marking the digest `fetchPath: 'rendered'`, merging computed typography/palette/background-image signals over the static ones, and populating `digest.screenshotKeys` (mobile/tablet/desktop).
- **Budget-exhaustion fallback**: when the Browser-Rendering budget is exhausted (or the BROWSER binding / driver / screenshot upload is unavailable), the action degrades to the static path, marks the digest `fetchPath: 'static'`, appends a `whatsMissing` entry citing the cause, and still returns a successful result (it does NOT return a failure).
- **Multimodal AI commentary**: when a desktop screenshot is available, the Haiku 4.5 commentary call includes it as an image content block and the prompt asks the model to comment on visual properties (alignment, density, hero/imagery treatment, layout rhythm) in addition to the signal bullets; the deterministic fallback still applies when no model key is configured or the call fails.
- Operator-intent gating: analysis only proceeds when the operator's most recent chat message implies fetch intent, or a fresh session-bound intent token is supplied.
- A 24-hour digest cache keyed on the URL + schema version, so a repeat analysis returns the prior digest without re-fetching, re-rendering, or re-running commentary.
- Propagation of every fetch-safety failure as a typed error on the action's failure branch — no safety failure surfaces as an uncaught exception.
- The generalized kind-tagged tool_result surfacing rule: any system action whose result carries a `kind` discriminator surfaces its data + kind in the chat response's tool calls so the front-end dispatcher can route it; the legacy no-kind read tool path is preserved.
- The Digest Report card UI: an info-toned card headed by the source URL, a **mobile/tablet/desktop screenshot strip rendered as the first body element when `screenshotKeys` are present** (images resolved via `/assets/{key}`), the digest markdown body, an asset-inventory sub-section with per-kind counts and thumbnails, and "Convert this site" / "Discard" actions.

**Out of scope (other stories / REQs):**
- The Reference Digest schema, signal extractors, escalation heuristic, rendered-fetch driver, computed-CSS extraction, screenshot upload, and KMS-aware markdown renderer — sibling story [[story-3f73931a]] (CAP-46). This story consumes those primitives; it does not implement them.
- Layer B transcription that "Convert this site" eventually triggers — REQ-28 (this story only emits the request event).
- Multi-page crawl / sitemap discovery — REQ-29.
- Persisting the digest (and its R2 screenshots) beyond the in-memory chat session — deferred (REQ-23/24); R2 screenshot cleanup is manual for the demo.

## Technical Context

- Action implemented as a `system_action` in the Operator API registry (CAP-43), `plan_tier='trial'`, `ui_route=null`, dispatched both through `/api/chat` (which threads the operator's latest message and mints intent tokens) and the direct `/api/operator/analyze_page` POST route (which passes a null operator message, requiring an explicit intent token). The tool's `input_schema` exposes `url`, optional `intentToken`, and optional `forceRendered`.
- Safety primitives consumed from CAP-44 (External Fetch Safety): `safeFetch`, `checkRateLimit`, `RobotsTxtCache`, `verifyIntentToken`, `operatorMessageImpliesIntent`, plus the Browser-Rendering budget gate (`checkBrowserBudget` / `chargeBrowserBudget`). The 1h per-URL response cache and the 24h digest cache both live in `FETCH_CACHE_KV`.
- Rendered path consumes the extractor primitives from [[story-3f73931a]] — `shouldEscalateToRendered`, `renderedFetch` (via an injected `@cloudflare/puppeteer` driver), `mergeComputedSignals`, `uploadScreenshots`. Screenshots are written to `ASSETS_BUCKET` under the `references/{chatId}/{turnId}/{viewport}.png` layout and surfaced to the card via `/assets/{key}`.
- The `BROWSER` binding is scoped to `[env.production]` in `wrangler.toml`; Wrangler dev does not emulate Browser Rendering, so dev degrades to the static path (the handler treats a missing `env.BROWSER` as a budget/binding-unavailable fallback).
- AI commentary uses model `claude-haiku-4-5-20251001`; on missing `CLAUDE_API_KEY`, a non-2xx response, or unparseable output it falls back to a deterministic summary + the baseline what's-missing list derived from the signals. When a desktop screenshot key is present it is fetched from `ASSETS_BUCKET` and attached as a base64 `image/png` content block.
- Digest cache key = `sha256(url|schemaVersion)`, TTL 24h.
- The card renderer registers with the tool-result dispatcher (CAP-38) under `kind='reference_digest'` and renders the digest markdown via the shared marked + DOMPurify pipeline.
- **Divergence note for regression:** if `FETCH_CACHE_KV` / `FETCH_ROBOTS_KV` bindings are absent the action fails fast with a configuration error rather than degrading; this is a deployment precondition, not an operator-visible safety failure. A 2026-06-24 bundle amendment proposing render-by-default (removing the escalation heuristic / `forceRendered`) is REQ-49 work and is NOT reconciled here — the escalation-heuristic behaviour above is the reconciled ground truth.

## Dependencies

Plan items 1 (Operator API / CAP-43), 3 (External Fetch Safety / CAP-44, incl. Browser-Rendering budget), 5 (chat tool-result surface / STORY-46), 6 (Reference Digest extractors + rendered-path primitives / [[story-3f73931a]]).

## Story Points

3