---
uid: acceptance_criterion-aef58ea9
id: AC-580
type: acceptance_criterion
title: get_site_definition read tool returns the current draft and is available on
  every plan tier
created_by: xgd
created_at: '2026-06-27T00:55:13.174875+00:00'
updated_at: '2026-06-27T00:55:13.174875+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat AI can read the current draft site definition on demand via a `get_site_definition` operator action. The action is registered with `category: 'system_action'`, `plan_tier: 'trial'`, and `ui_route: null` (chat-only, no UI affordance), and is therefore offered to sessions on every plan tier (trial and above). When the AI invokes it during a chat turn, the handler returns the current working/draft site definition, and that definition is surfaced back to the AI as the `data` field of the tool's structured success result so the model can verify canonical state mid-conversation. Invoking the tool does not mutate site state.

## Verification

Issue a `POST /api/chat` (default trial session, no `x-plan-tier` header) whose stubbed upstream first response calls `get_site_definition` and whose second response is text-only. Assert: the tool is not rejected on plan-tier grounds (trial is permitted); the `tool_result` returned to the model on the next turn is `ok: true` and carries a `data`/`applied.data` payload equal to the current draft site definition the request supplied; and the working site is unchanged by the read. Repeat with an explicit `x-plan-tier: trial` header and confirm the same outcome.
