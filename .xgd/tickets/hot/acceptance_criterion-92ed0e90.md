---
uid: acceptance_criterion-92ed0e90
id: AC-648
type: acceptance_criterion
title: Batch mirror deduplicates URLs and aggregates successes, failures, and a URL→key
  map
created_by: xgd
created_at: '2026-06-28T20:40:24.860361+00:00'
updated_at: '2026-06-28T20:40:24.860361+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-5d1952ba
  kind: behavior
  regression_only: false
---

## Criterion
Mirroring a batch of URLs fetches each *unique* URL exactly once regardless of how many times it appears in the input, bounded by a fixed concurrency cap (default 4). It returns the set of successes, the set of failures (each with its reason), and a map from each successfully-mirrored URL to its storage key. A per-result callback fires once for every unique URL processed. A batch containing a mix of fetchable and failing URLs returns both buckets correctly populated, and duplicate URLs collapse onto a single stored object / single map entry.

## Verification
Mirror a batch whose input repeats one URL several times plus one other URL; assert the underlying fetch is invoked exactly once per unique URL, that the success count equals the unique count, and that the URL→key map has one distinct key per unique URL. Mirror a mixed batch (one ok, one `body_too_large`, one `requires_robots_override`); assert one success, two failures with the expected reason names, and that the per-result callback fired once per unique URL.
