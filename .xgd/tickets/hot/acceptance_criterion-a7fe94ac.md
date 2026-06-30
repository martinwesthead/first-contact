---
uid: acceptance_criterion-a7fe94ac
id: AC-780
type: acceptance_criterion
title: xgd_ticket tool is present with the {create,list,get} contract when dev-tools
  are enabled
created_by: xgd
created_at: '2026-06-30T01:10:21.277713+00:00'
updated_at: '2026-06-30T01:10:21.277713+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
When the dev-tools environment flag is set to "true", the AI tool set includes an `xgd_ticket` tool whose input contract requires a `command` constrained to the enum {create, list, get} and accepts an optional `args` array of strings.

## Verification
Build the AI-visible tool set with the dev-tools flag enabled; assert the `xgd_ticket` tool is present and its input schema restricts `command` to exactly create/list/get with `command` required and `args` an optional string array.
