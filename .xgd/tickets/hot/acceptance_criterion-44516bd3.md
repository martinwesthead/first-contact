---
uid: acceptance_criterion-44516bd3
id: AC-603
type: acceptance_criterion
title: Rate-limit exhaustion blocks analysis with a typed failure carrying a retry
  hint
created_by: xgd
created_at: '2026-06-27T01:26:05.059661+00:00'
updated_at: '2026-06-27T01:26:05.059661+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When the calling account has exhausted a fetch rate-limit window, the analyze action returns a typed failure whose message identifies the exhausted window and a retry-after duration in seconds; the page body is not fetched.

## Verification
Pre-fill the rate-limit counters for the account to exceed a window, then analyze a URL. Assert a failure result whose message names the window and includes a retry-after value, and that no page-body fetch occurred.
