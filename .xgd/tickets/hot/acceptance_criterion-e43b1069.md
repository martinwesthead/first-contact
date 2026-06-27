---
uid: acceptance_criterion-e43b1069
id: AC-554
type: acceptance_criterion
title: Paid-plan chat session additionally receives paid-tier system-action tools
  in its Anthropic tool list
created_by: xgd
created_at: '2026-06-27T00:24:41.888062+00:00'
updated_at: '2026-06-27T00:24:41.888062+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When `POST /api/chat` is invoked with `x-plan-tier: paid`, the Anthropic Messages API request's `tools` array contains, in addition to the eight state-edit tool specs, the paid-tier system-action tool specs — at minimum `publish_stub` (the seed paid-tier system action registered alongside the registry). The filter follows tier ordering (`paid` permits `trial` and `paid` actions); a paid session therefore sees a strict superset of the trial session's tool list.

## Verification

Construct a POST to `/api/chat` with `x-plan-tier: paid` and a representative body. Stub the upstream fetch and capture the outgoing JSON body. Assert that the names in the outgoing `tools` array include every one of the eight state-edit tool names AND include `publish_stub`. Repeat with a parallel request that sets `x-plan-tier: trial` (or no header) and assert `publish_stub` is absent there, confirming the paid tier is a strict superset of the trial tier.
