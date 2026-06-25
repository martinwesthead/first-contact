---
uid: acceptance_criterion-88cbfc9e
id: AC-486
type: acceptance_criterion
title: POST /api/chat proxies the Anthropic Messages API and returns extracted text
  and tool_use blocks
created_by: xgd
created_at: '2026-06-25T02:00:41.742571+00:00'
updated_at: '2026-06-25T02:00:41.742571+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` on the control-app Worker, given a JSON body of `{history, siteDefinition, frameworkCatalog}` and a bound `CLAUDE_API_KEY` secret, forwards a request to the Anthropic Messages API with: the Anthropic endpoint URL, an `x-api-key` header carrying the bound secret, an `anthropic-version: 2023-06-01` header, JSON content type, the configured Claude model (default `claude-sonnet-4-6`), the v1 tool surface as `tools` (every tool of the eight-call AI surface present by name), a `system` prompt string that embeds the framework catalog (module ids/versions, dial names, theme-token names), and the chat history filtered to user/assistant messages. The handler then returns `{text, toolCalls}` JSON, with `text` joined from `text` content blocks and `toolCalls` extracted from `tool_use` blocks.

## Verification

Construct a POST request with a representative chat history, site definition, and the framework catalog. Stub the upstream fetch and verify the outgoing request URL, method, headers (api-key, anthropic-version, content-type), model, tool list (contains every name of the eight v1 tools), system-prompt string (contains a module identifier such as `hero@v1` and a theme-token name such as `palette.primary`), and messages. Have the stub return a mock Anthropic message with one `text` block and one `tool_use` block. Verify the handler responds 200 with a JSON body whose `text` equals the upstream text-block content and whose `toolCalls` equals the upstream tool_use blocks as `{name, input}`.
