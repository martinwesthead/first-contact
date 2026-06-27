---
uid: acceptance_criterion-8f2dc0bc
id: AC-607
type: acceptance_criterion
title: The Digest Report card renders the source URL, digest markdown, and a per-kind
  asset inventory with thumbnails
created_by: xgd
created_at: '2026-06-27T01:26:15.790932+00:00'
updated_at: '2026-06-27T01:26:15.790932+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
Given a successful `reference_digest` tool_result, the builder renders an info-toned card whose header names the source URL, whose body contains the digest markdown rendered as sanitized HTML, and whose asset-inventory sub-section shows per-kind counts (images / backgrounds / videos) plus a thumbnail for each inventoried asset grouped by kind (image/background as `<img>`, video as a labelled entry).

## Verification
Pass a `reference_digest` tool_result with a populated asset inventory to the renderer. Assert the card header contains the source URL, the body contains the rendered markdown, the counts element reports the correct per-kind totals, and a thumbnail element exists for each asset under its kind group.
