---
uid: story-3f73931a
id: STORY-55
type: story
title: Extract a reference website's design signals into a canonical Reference Digest
created_by: xgd
created_at: '2026-06-27T01:09:57.646726+00:00'
updated_at: '2026-06-27T01:21:35.507936+00:00'
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

**As an** operator who wants to reproduce an existing website using the platform framework (with the AI assistant helping me),
**I want** the reference site's visible design characteristics — colour palette, typography, layout, imagery/asset inventory, and content structure — captured deterministically into one structured Reference Digest with a human-readable markdown rendering,
**so that** I and the AI reason about the same evidence and can see exactly which design signals were detected and which are missing.

## Description

This story formalises the `packages/extractor` library: the canonical Reference Digest data contract and the deterministic ("Layer A") extractors that turn a fetched HTML document into that contract, plus the markdown renderer that projects it for human reading.

In scope:
- A stable, versioned Reference Digest schema (schemaVersion 1) covering palette, typography, layout, imagery, content, and a per-asset inventory — exported as a validator so downstream consumers can validate digests.
- Five deterministic extractors that derive each signal category from HTML + a base URL, using only the document's own markup and `<style>`/inline CSS (no external stylesheets, no computed layout, no LLM).
- The "absence as content" property: every individual signal field serialises as the literal string `not_detected` (or its array/typed equivalent) rather than being omitted or null, so a sparse page still produces a complete, readable digest.
- A deterministic baseline "what's missing" list derived from absent signals (used as the fallback when no AI commentary pass runs).
- A KMS-aware markdown renderer producing the DOC-9 §9 shape (single H1 title, blockquote summary, table of contents, numbered sections per signal category, per-kind asset inventory, "What's missing" section).
- A static-only escalation hook that always reports "do not escalate" in this version (the REQ-22 Browser Rendering integration point).

Out of scope (owned elsewhere):
- Fetching the URL, SSRF/scheme safety, robots, rate limiting, browser budget, operator-intent tokens, and KV digest caching (External Fetch Safety / Operator API).
- The `analyze_page` operator action that orchestrates fetch → extract → AI commentary, and the AI commentary pass itself.
- The `DigestReport` chat-card UI that renders the digest to the operator.
- Browser Rendering escalation (REQ-22): the rendered fetch path, computed-CSS palette/typography, and screenshot capture.

## Technical Context

- Grounded in REQ-21 (bundled as bundle-bbb1bd9c). The operator's stated goal: "reproduce their site so it looks as identical as possible using our framework; if there are gaps we need to understand what they are." The expanded asset inventory (img + srcset + inline background-image + `<style>` background-image + video/source) exists so the transcription step (REQ-28) has the full candidate set of visual assets to mirror.
- Convergence principle (DOC-9 §3): the same digest artifact serves both the operator and the AI. The markdown rendering and the structured schema are two projections of one source of truth.
- Consumed by the analyze_page action (plan item 7, same bundle) and downstream by REQ-22 (multi-modal commentary), REQ-28 (transcription input contract), and REQ-29 (multi-page crawl). The exported schema validator is the input contract REQ-28 relies on.
- HTML parsing runs via a DOM library that works in both the test (jsdom-like) environment and Cloudflare Workers, so the package is isolation-portable.
- Intent/code divergence to flag for regression: REQ-21's IN section sketches `imagery: ImagerySignals` as part of `signals`; the implementation splits this into a summary `imagery` object (img/background/video counts + heroDetected) plus a separate `assetInventory` array of per-asset records. This matches the operator's expanded-inventory decision in the 2026-06-18 planning chat and is the intended shape; the ACs below describe the implemented (and intended) split.

## Dependencies

None. (This is foundation work; plan item 7 — analyze_page + DigestReport — depends on this story.)

## Story Points

3