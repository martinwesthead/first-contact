---
uid: acceptance_criterion-88cbfc9e
id: AC-486
type: acceptance_criterion
title: POST /api/chat proxies the Anthropic Messages API and returns extracted text
  and tool_use blocks
created_by: xgd
created_at: '2026-06-25T02:00:41.742571+00:00'
updated_at: '2026-06-29T22:01:12.087668+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` on the control-app Worker, given a JSON body of `{history, siteDefinition, frameworkCatalog}` and a bound `CLAUDE_API_KEY` secret, runs a multi-turn tool loop (max 8 turns) against the Anthropic Messages API and returns a **Server-Sent Events stream** (`Content-Type: text/event-stream`) rather than a single JSON block. Each turn forwards a request carrying: the Anthropic endpoint URL, an `x-api-key` header with the bound secret, an `anthropic-version: 2023-06-01` header, JSON content type, the configured Claude model (default `claude-sonnet-4-6`), `stream: true`, a `tools` list constructed from the `OPERATOR_ACTIONS` registry filtered by the session's `plan_tier` (extracted from the `x-plan-tier` request header; defaults to `trial` when absent), a `system` prompt that embeds the framework catalog (module ids/versions, dial names, theme-token names) **recomputed each turn from the current working site definition**, and the running message list. There is no static `TOOL_DEFINITIONS` constant: the registry is the single source of truth for the tool surface.

The handler consumes Anthropic's upstream streaming SSE (accumulating `tool_use` input JSON from `input_json_delta` chunks) and re-emits these client-facing SSE events as they arrive:

- `token { delta }` — a text delta from the model, forwarded the moment it streams in.
- `tool_call { name, input, toolUseId }` — emitted once a `tool_use` block's input JSON has been fully reassembled, before server-side execution.
- `tool_result { name, input, result, toolUseId }` — the structured server-side execution result of that call.
- `done { text, toolCalls, systemActions, intentToken }` — the final aggregate; `text` is joined from all text content across turns, `toolCalls` carries each executed call with its structured `result`.
- `error { error }` — a fatal error before or during the stream; the stream then ends.

After each Anthropic response, every `tool_use` block is executed server-side and a structured `tool_result` content block is appended to the message list before the model is re-called: `{ok: true, applied: {tool, args, summary}}` on success (state-edit calls advance the working site and `summary` describes what landed; `data`/`kind` are added when the tool returns a structured payload) or `{ok: false, error: {tool, validation}}` on failure (the block returned to Anthropic is additionally flagged `is_error: true`). State-edit failures and unknown tools leave the working site unchanged. The loop ends when a response carries no tool calls or the 8-turn cap is reached, at which point the `done` event fires.

## Verification

Construct a POST with a representative chat history, site definition, and framework catalog. Stub the upstream fetch so the first response streams a `tool_use` block (a valid state-edit) followed by a `text` block, and the second streams only `text`. Consume the SSE response and verify: (1) the first outgoing upstream request carries `stream: true`, and its tool list is derived from `OPERATOR_ACTIONS` filtered by the session `plan_tier` (a default trial session resolves to at least the eight state-edit tool names: `set_module_content`, `set_module_dial`, `set_module_variant`, `add_module`, `remove_module`, `reorder_modules`, `set_theme_token`, `set_site_config`) and its system prompt contains a module identifier such as `hero@v1` and a theme-token name such as `palette.primary`; (2) the response is `text/event-stream` and emits `token` events for the text deltas, a `tool_call` event for the first call, and a `tool_result` event with `ok: true` and a non-empty `summary`; (3) a second upstream request is made whose message list contains the `tool_result` block and whose system prompt reflects the post-edit working site (state recomputed, not the original snapshot); (4) a final `done` event carries `text` equal to the joined upstream text and `toolCalls` carrying the executed call with its `result`. Also verify a rejected tool call produces a `tool_result` event with `ok: false` (and `is_error: true` on the Anthropic block) and leaves the working site unchanged, and that a fatal upstream failure surfaces a single `error` event.
