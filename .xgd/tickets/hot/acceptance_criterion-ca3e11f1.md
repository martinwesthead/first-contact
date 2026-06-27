---
uid: acceptance_criterion-ca3e11f1
id: AC-551
type: acceptance_criterion
title: Registry entries expose category, plan_tier, tool_spec, and ui_route through
  AI tool list and parity audit
created_by: xgd
created_at: '2026-06-27T00:09:19.276350+00:00'
updated_at: '2026-06-27T00:09:19.276350+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
The set of operator actions is described by uniform registry entries that distinguish `state_edit` from `system_action` categories, carry a plan_tier, expose an Anthropic-shaped `tool_spec` (with name, description, input_schema), and declare a `ui_route` (string or null for chat-only). The AI tool list returned by the chat surface is the subset of registry entries whose plan_tier is permitted by the caller's tier. A parity-audit invocation enumerates every registered action and surfaces those whose `ui_route` is null or unimplemented.

## Verification
A UAT sends `POST /api/chat` (or the equivalent tool-list-inspection endpoint) with `x-plan-tier: trial` and observes that the tools advertised to the model include all state-edit tool names and `report_validation_rejection` but exclude `publish_stub`. The same call with `x-plan-tier: paid` includes `publish_stub`. Running the parity-audit CLI exits with a status code reflecting whether any registered action's `ui_route` is unimplemented, and its stdout lists each action's name, category, plan_tier, and ui_route status.
