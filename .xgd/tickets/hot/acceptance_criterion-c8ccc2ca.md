---
uid: acceptance_criterion-c8ccc2ca
id: AC-559
type: acceptance_criterion
title: Redirect chain is capped at 5 hops
created_by: xgd
created_at: '2026-06-27T00:33:37.842113+00:00'
updated_at: '2026-06-27T00:33:37.842113+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A fetch chain that follows 5 redirects (each to a valid public URL) succeeds at the 5th hop and returns the final body. A chain that would require a 6th redirect is rejected with reason `too_many_redirects` and no body is returned to the caller.

## Verification

With a controlled `fetchImpl` returning 5 sequential 301 redirects to a final 200 response, the fetch succeeds. With a controlled `fetchImpl` returning 6 sequential 301 redirects, the fetch returns `{ok:false, reason:'too_many_redirects'}`.
