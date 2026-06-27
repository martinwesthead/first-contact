---
uid: acceptance_criterion-8822d7ca
id: AC-561
type: acceptance_criterion
title: Identical GET fetches within 1 hour return from the response cache
created_by: xgd
created_at: '2026-06-27T00:33:58.996789+00:00'
updated_at: '2026-06-27T00:33:58.996789+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

Two GET fetches with identical method, URL, and range issued within 1 hour: the first triggers an upstream request and stores the response under a key derived from `sha256(method|url|range)`; the second is served from the KV cache and the result indicates a cache HIT (cache-status indicator `HIT` and a response header `x-fetch-cache: HIT`). Only one upstream request is observed.

Non-GET methods bypass the cache (no read, no write). Non-2xx responses are not cached. A different range header produces a different cache key.

## Verification

With a controlled `fetchImpl` and a KV stub, perform two identical successful GET fetches and assert:
- The second result has `cacheStatus: 'HIT'` and `x-fetch-cache: HIT` header.
- The controlled fetch implementation was invoked exactly once across the two calls.
- A third call with a different range header triggers a fresh upstream request (cacheStatus `MISS`).
