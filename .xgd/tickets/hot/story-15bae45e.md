---
uid: story-15bae45e
id: STORY-56
type: story
title: Analyze a reference URL into an interactive Digest Report in the builder chat
created_by: xgd
created_at: '2026-06-27T01:25:03.197100+00:00'
updated_at: '2026-06-27T01:36:42.801444+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-bbb1bd9c
  capability_uid: capability-9395ee51
  story_kind: feature
  story_points: 3
---

## Story

**As an** operator building a site in the builder, **I want** to paste a reference website's URL into the chat and have the assistant analyze it into a Reference Digest rendered as an interactive card, **so that** I can review the site's design signals and asset inventory and decide whether to reproduce it.

## Description

This story covers the operator-facing **analyze action** that turns a pasted URL into a Reference Digest, and the **Digest Report card** that renders the result in the chat panel. It is the first concrete consumer that ties together the Operator API (CAP-43), the External Fetch Safety contract (CAP-44), the chat tool-result rendering surface (CAP-38 / STORY-46), and the Reference Digest extractors and schema (CAP-46, sibling story [[story-3f73931a]]).

**In scope:**
- The `analyze_page` system action: an authorized, plan-tier-gated operator action that fetches a URL through the safety layer, runs the deterministic extractors, runs an AI commentary pass, caches the result, and returns a structured `reference_digest` tool_result.
- Operator-intent gating: analysis only proceeds when the operator's most recent chat message implies fetch intent, or a fresh session-bound intent token is supplied.
- A 24-hour digest cache keyed on the URL + schema version, so a repeat analysis returns the prior digest without re-fetching or re-running commentary.
- AI commentary pass (Claude Haiku 4.5) with a deterministic fallback so analysis always completes even when no model key is configured or the model call fails.
- Propagation of every fetch-safety failure as a typed error on the action's failure branch — no safety failure surfaces as an uncaught exception.
- The generalized kind-tagged tool_result surfacing rule: any system action whose result carries a `kind` discriminator surfaces its data + kind in the chat response's tool calls so the front-end dispatcher can route it; the legacy no-kind read tool path is preserved.
- The Digest Report card UI: an info-toned card headed by the source URL, the digest markdown body, an asset-inventory sub-section with per-kind counts and thumbnails, and "Convert this site" / "Discard" actions.

**Out of scope (other stories / REQs):**
- The Reference Digest schema, signal extractors, and KMS-aware markdown renderer — sibling story [[story-3f73931a]] (CAP-46).
- Browser-rendering escalation, multimodal commentary using a screenshot — REQ-22 (the escalation hook always stays on the static path here).
- Layer B transcription that "Convert this site" eventually triggers — REQ-28 (this story only emits the request event).
- Multi-page crawl / sitemap discovery — REQ-29.
- Persisting the digest beyond the in-memory chat session — deferred (REQ-23/24).

## Technical Context

- Action implemented as a `system_action` in the Operator API registry (CAP-43), `plan_tier='trial'`, `ui_route=null`, dispatched both through `/api/chat` (which threads the operator's latest message and mints intent tokens) and the direct `/api/operator/analyze_page` POST route (which passes a null operator message, requiring an explicit intent token).
- Safety primitives consumed from CAP-44 (External Fetch Safety): `safeFetch`, `checkRateLimit`, `RobotsTxtCache`, `verifyIntentToken`, `operatorMessageImpliesIntent`. The 1h per-URL response cache and the 24h digest cache both live in `FETCH_CACHE_KV`.
- AI commentary uses model `claude-haiku-4-5-20251001`; on missing `CLAUDE_API_KEY`, a non-2xx response, or unparseable output it falls back to a deterministic summary + the baseline what's-missing list derived from the signals.
- Digest cache key = `sha256(url|schemaVersion)`, TTL 24h.
- The card renderer registers with the tool-result dispatcher (CAP-38) under `kind='reference_digest'` and renders the digest markdown via the shared marked + DOMPurify pipeline.
- **Divergence note for regression:** if `FETCH_CACHE_KV` / `FETCH_ROBOTS_KV` bindings are absent the action fails fast with a configuration error rather than degrading; this is a deployment precondition, not an operator-visible safety failure.

## Dependencies

Plan items 1 (Operator API / CAP-43), 3 (External Fetch Safety / CAP-44), 5 (chat tool-result surface / STORY-46), 6 (Reference Digest extractors / [[story-3f73931a]]).

## Story Points

3