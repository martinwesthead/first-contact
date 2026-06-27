---
uid: acceptance_criterion-14d698b7
id: AC-547
type: acceptance_criterion
title: Missing or invalid auth headers default the request to plan tier trial
created_by: xgd
created_at: '2026-06-27T00:08:59.463834+00:00'
updated_at: '2026-06-27T00:08:59.463834+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
A request with no `x-plan-tier` header, or with an `x-plan-tier` value outside the recognized set, is treated as plan tier `trial` for both dispatch authorization and AI tool-list filtering. A request with no `x-account-id` header is treated as account `anonymous`. A trial-tier-permitted action succeeds; a paid-tier-required action is rejected.

## Verification
A UAT sends `POST /api/operator/report_validation_rejection` with `x-session-id: sess-3` and no `x-plan-tier` or `x-account-id` header; the response is 200 (action is `trial`-permitted). The same UAT sends `POST /api/operator/publish_stub` with `x-session-id: sess-3` and no `x-plan-tier` header; the response is 403 and the body mentions `"trial"` as the caller's effective tier. A third request sends `x-plan-tier: bogus` to a paid action and is rejected with 403 mentioning `"trial"`.
