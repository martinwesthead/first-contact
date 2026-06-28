---
uid: story-5d1952ba
id: STORY-59
type: story
title: 'Convert flow: mirror referenced site assets into platform storage'
created_by: xgd
created_at: '2026-06-28T20:39:44.803309+00:00'
updated_at: '2026-06-28T20:39:44.803309+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-e343131c
  story_kind: feature
  story_points: 3
---

## Story
**As an** operator converting an existing website, **I want** every visual asset referenced by my converted draft to be downloaded into the platform's own storage under a stable, deduplicated key — and any asset that cannot be downloaded to be named with the reason it failed — **so that** my converted site is self-contained (no live dependency on the source site) and I can see exactly which assets remained externally referenced.

## Description
This story documents the asset-mirroring subsystem of the convert flow (REQ-28 Stage 4, surviving REQ-30's reshape as a deterministic, mechanical building block — no LLM involvement). It provides two operations:

- **Single-asset mirror**: fetch one absolute asset URL through the external-fetch safety layer (CAP-44 / REQ-20: SSRF guard, robots override, rate limiting, body-size cap), classify the response `Content-Type` to a file extension and canonical type, and write the bytes to the platform asset bucket at a content-addressed key `sites/{siteId}/imports/{sha256(url):16}.{ext}`. It returns a structured success (`r2Key`, `contentType`, `bytes`) or a structured failure carrying a named reason.
- **Batch mirror**: download many URLs with a fixed concurrency cap (default 4), deduplicating identical URLs so each unique URL is fetched and stored exactly once, and returning the successes, the failures (each with its reason), and a URL→storage-key map. Each result is also emitted via a progress callback as it lands so the orchestrator can stream progress.

**In scope**: content-type → extension classification (png/jpg/webp/svg/gif/avif + mp4/webm/mov; unknown → `.bin`), content-addressed dedup keying, the failure-reason taxonomy that the chat "What couldn't mirror" surface relies on, batch concurrency and dedup, idempotent overwrite of the same key for the same URL.

**Out of scope**: the orchestration that decides *which* assets to mirror and rewrites module AssetRefs (that is the transcribe_site orchestration, item 3); the safety layer itself (CAP-44); generic key-addressed asset CRUD (CAP-45). This subsystem is a distinct safe-fetch + content-addressed import pipeline, not an extension of generic asset storage.

## Technical Context
- All downloads route through CAP-44 (External Fetch Safety / REQ-20) `safeFetch`; this subsystem never bypasses SSRF, robots, rate-limit, or the 5 MB body cap. The safety layer's failure reasons are mapped into a stable mirror-failure taxonomy: `private_ip` / `disallowed_scheme` / `too_many_redirects` (and other SSRF-class rejects) collapse to `ssrf_blocked`; `body_too_large`, `requires_robots_override`, `rate_limited`, and `missing_intent` keep their names; transport/budget failures map to `network_error`. Non-2xx responses yield `non_2xx`, and an R2 write failure yields `r2_put_failed`.
- **Divergence from intent (note for regression):** the operator's spec enumerated png/jpeg/webp/svg/gif and mp4/webm; the implemented classifier additionally supports `image/avif` (→ `avif`) and `video/quicktime` (→ `mov`). This is a superset of stated intent, not a contradiction. The R2 key prefix and 16-char SHA truncation match the spec exactly.
- The R2 bucket is the CAP-44 `ASSETS_BUCKET`. The content-addressed key makes a re-run idempotent: a failed convert can be re-run and successful retries overwrite the same keys (no rollback).
- Reused by both the REQ-28 and REQ-30 convert orchestrations; kept as a self-contained pure-I/O subsystem in packages/extractor.

## Dependencies
None (plan item 5 has no dependencies). Consumed by item 3 (transcribe_site orchestration) and item 4 (TranscriptionDigest derivation).

## Story Points
3
