---
uid: acceptance_criterion-88cbfc9e
id: AC-486
type: acceptance_criterion
title: POST /api/chat proxies the Anthropic Messages API and returns extracted text
  and tool_use blocks
created_by: xgd
created_at: '2026-06-25T02:00:41.742571+00:00'
updated_at: '2026-06-27T00:54:35.804683+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` on the control-app Worker, given a JSON body of `{history, siteDefinition, frameworkCatalog}` and a bound `CLAUDE_API_KEY` secret, runs a multi-turn tool loop (max 8 turns) against the Anthropic Messages API. Each turn forwards a request carrying: the Anthropic endpoint URL, an `x-api-key` header with the bound secret, an `anthropic-version: 2023-06-01` header, JSON content type, the configured Claude model (default `claude-sonnet-4-6`), a `tools` list constructed from the `OPERATOR_ACTIONS` registry filtered by the session's `plan_tier` (extracted from the `x-plan-tier` request header; defaults to `trial` when absent), a `system` prompt that embeds the framework catalog (module ids/versions, dial names, theme-token names) **recomputed each turn from the current working site definition**, and the running message list. There is no static `TOOL_DEFINITIONS` constant: the registry is the single source of truth for the tool surface.

After each Anthropic response, every `tool_use` block is executed server-side and a structured `tool_result` content block is appended to the message list before the model is re-called: `{ok: true, applied: {tool, args, summary}}` on success (state-edit calls advance the working site and `summary` describes what landed; `data`/`kind` are added when the tool returns a structured payload) or `{ok: false, error: {tool, validation}}` on failure (the block returned to Anthropic is additionally flagged `is_error: true`). State-edit failures and unknown tools leave the working site unchanged. The loop ends when a response carries no tool calls or the 8-turn cap is reached. The handler then returns `{text, toolCalls, systemActions, intentToken}` JSON, with `text` joined from all `text` content blocks across turns and `toolCalls` carrying each executed call with its structured `result`.

## Verification

Construct a POST with a representative chat history, site definition, and framework catalog. Stub the upstream fetch so the first response returns a `tool_use` block (a valid state-edit) and the second returns only a `text` block. Verify: (1) the first outgoing request's tool list is derived from `OPERATOR_ACTIONS` filtered by the session `plan_tier` (a default trial session resolves to at least the eight state-edit tool names: `set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`) and its system prompt contains a module identifier such as `hero@v1` and a theme-token name such as `palette.primary`; (2) a second upstream request is made whose message list contains a `tool_result` block for the first call with `ok: true` and a non-empty `summary`; (3) the second request's system prompt reflects the post-edit working site (state recomputed, not the original snapshot); (4) the handler responds 200 with a JSON body whose `text` equals the upstream text content and whose `toolCalls` carries the executed call with its `result`. Also verify a rejected tool call produces a `tool_result` with `ok: false`, `is_error: true` on the Anthropic block, and leaves the working site unchanged.
