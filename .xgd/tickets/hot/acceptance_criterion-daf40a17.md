---
uid: acceptance_criterion-daf40a17
id: AC-553
type: acceptance_criterion
title: Trial-plan chat session is offered state-edit tools but no paid-tier system-action
  tools
created_by: xgd
created_at: '2026-06-27T00:24:22.071919+00:00'
updated_at: '2026-06-27T00:24:22.071919+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When `POST /api/chat` is invoked with no `x-plan-tier` header, or with `x-plan-tier: trial`, the Anthropic Messages API request's `tools` array contains the eight state-edit tool specs (`set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`) and does NOT contain paid-tier system-action tool specs such as `publish_stub`. The filter is plan-tier-ordered (trial sees `plan_tier: 'trial'` actions only); the eight state-edit tools all carry `plan_tier: 'trial'` and therefore always appear.

## Verification

Construct a POST to `/api/chat` with a representative body and either no `x-plan-tier` header (the default-trial path) or `x-plan-tier: trial`. Stub the upstream fetch and capture the outgoing JSON body. Assert that the names in the outgoing `tools` array include every one of the eight state-edit tool names and DO NOT include `publish_stub`. Repeat with a second request that explicitly sets `x-plan-tier: trial` and assert the same shape, to confirm the default and explicit-trial paths produce the same tool list.
