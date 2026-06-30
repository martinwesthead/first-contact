---
uid: acceptance_criterion-a5b9f9c3
id: AC-779
type: acceptance_criterion
title: xgd_ticket tool is absent from the AI tool set when dev-tools are disabled
created_by: xgd
created_at: '2026-06-30T01:10:17.261759+00:00'
updated_at: '2026-06-30T01:10:17.261759+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
When the dev-tools environment flag is not set to "true", the tool set the chat endpoint offers to the AI contains no tool named `xgd_ticket`. This holds regardless of plan tier.

## Verification
Build the AI-visible tool set with the dev-tools flag unset/disabled and assert no entry has name `xgd_ticket`.
