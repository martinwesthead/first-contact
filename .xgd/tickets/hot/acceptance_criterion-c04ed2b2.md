---
uid: acceptance_criterion-c04ed2b2
id: AC-600
type: acceptance_criterion
title: A repeat analysis of the same URL within 24h returns the cached digest without
  re-fetching or re-running commentary
created_by: xgd
created_at: '2026-06-27T01:25:56.736164+00:00'
updated_at: '2026-06-27T01:25:56.736164+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
A second analysis of the same URL within the 24-hour digest cache window returns the previously produced digest, marked as a cache hit (`cache === "HIT"`), without performing a new page fetch and without invoking the AI commentary pass.

## Verification
Analyze a URL once (cache MISS), then analyze the identical URL again with the page-fetch and model-call dependencies instrumented. Assert the second call returns the same digest with `cache === "HIT"`, and that neither the fetch nor the commentary model call was made on the second invocation.
