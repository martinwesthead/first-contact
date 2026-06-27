---
uid: acceptance_criterion-88cbfc9e
id: AC-486
type: acceptance_criterion
title: POST /api/chat proxies the Anthropic Messages API and returns extracted text
  and tool_use blocks
created_by: xgd
created_at: '2026-06-25T02:00:41.742571+00:00'
updated_at: '2026-06-27T00:24:07.461618+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` on the control-app Worker, given a JSON body of `{history, siteDefinition, frameworkCatalog}` and a bound `CLAUDE_API_KEY` secret, forwards a request to the Anthropic Messages API with: the Anthropic endpoint URL, an `x-api-key` header carrying the bound secret, an `anthropic-version: 2023-06-01` header, JSON content type, the configured Claude model (default `claude-sonnet-4-6`), a `tools` list constructed from the `OPERATOR_ACTIONS` registry filtered by the session's `plan_tier` (extracted from the `x-plan-tier` request header; defaults to `trial` when absent), a `system` prompt string that embeds the framework catalog (module ids/versions, dial names, theme-token names), and the chat history filtered to user/assistant messages. The handler then returns `{text, toolCalls}` JSON, with `text` joined from `text` content blocks and `toolCalls` extracted from `tool_use` blocks. There is no static `TOOL_DEFINITIONS` constant: the registry is the single source of truth for the tool surface.

## Verification

Construct a POST request with a representative chat history, site definition, and the framework catalog. Stub the upstream fetch and verify the outgoing request URL, method, headers (api-key, anthropic-version, content-type), model, tool list (derived from `OPERATOR_ACTIONS` filtered by the session's `plan_tier` — for a default trial session this resolves to at least the eight state-edit tool names: `set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`), system-prompt string (contains a module identifier such as `hero@v1` and a theme-token name such as `palette.primary`), and messages. Have the stub return a mock Anthropic message with one `text` block and one `tool_use` block. Verify the handler responds 200 with a JSON body whose `text` equals the upstream text-block content and whose `toolCalls` carries the upstream tool_use blocks as `{name, input}` entries.
