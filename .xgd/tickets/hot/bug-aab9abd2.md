---
uid: bug-aab9abd2
id: BUG-21
type: bug
title: 'Builder chat: system_action tool results mis-routed to browser dispatcher
  → ''unknown tool'''
created_by: xgd
created_at: '2026-06-29T23:07:49.108959+00:00'
updated_at: '2026-06-29T23:10:23.410128+00:00'
completed_at: null
last_field_updated: severity
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  severity: high
---

## Symptom

In the webbuilder chat, server-executed operator tools (`analyze_page`,
`transcribe_site`, `read_transcription_digest`, and other `system_action`
tools) intermittently come back as `unknown tool: <name>` even though the
server executed them. The failures are then reinjected into the next turn as a
`[system] … → unknown tool: analyze_page` note, which tells the model its own
valid tools don't exist and derails the convert / analyze ("paste URL → themed
site") flow.

Observed transcript: `transcribe_site` succeeded when it returned a cleared
site, but the same tool plus `analyze_page` / `read_transcription_digest` were
reported as `unknown tool` in a later turn and carried forward as failed calls.

## Root cause

The builder chat has two tool-execution surfaces:

- **Server-side** (`apps/control-app/src/operator/registry.ts`) categorizes
  every tool as `state_edit` or `system_action`. `system_action` tools
  (analyze_page, transcribe_site, read_transcription_digest, …) execute
  **only** on the server.
- **Browser-side** (`packages/builder-ui/src/tools.ts` → `applyToolCall`)
  knows **only** the `state_edit` preview-mutation tools. Its default branch
  emits `unknown tool: <name>`.

In the client driver `runChatTurn`, the `tool_result` SSE handler
(`packages/builder-ui/src/chat-driver.ts:241-296`) re-runs **every** server
tool result through `applyToolCall` to mirror it onto the live preview — except
the special `transcribe_site_done` cleared-site case handled by
`extractClearedSite`. For any `system_action` result that is not a cleared
site, `applyToolCall` does not recognize the name and returns
`unknown tool: <name>`. That result is recorded as a **rejected** tool call
(tool pane shows ✗ despite server success) and pushed into
`pendingToolFailures`, which `formatFailureNote` reinjects on the next turn.

The client never mirrors the server's `state_edit` / `system_action` split; it
blindly applies all results locally.

## Fix

Make the client mirror the server's category distinction: only run
**`state_edit`** tools through `applyToolCall`. `system_action` tool results are
already executed server-side and surface via result cards (digest report,
transcribe progress, etc.) — the driver must record them as accepted/rejected
based on the **server** result (`serverResult.ok`) and never pass them to the
browser dispatcher.

Concretely:
- Export a runtime set of state-edit tool names from
  `packages/builder-ui/src/tools.ts` (the names already enumerated by the
  `ToolName` union).
- In `chat-driver.ts`'s `tool_result` handler, gate the `applyToolCall` branch
  on membership in that set. Non-state-edit results record accepted/rejected
  from the server result with no local apply and no spurious failure note.

## Test plan

UAT(s) named `test_UAT_FC_BUG-21_*` exercising the chat driver
(`runChatTurn`) with a mocked SSE stream:
- A `system_action` tool result (e.g. `analyze_page` ok / `read_transcription_digest`)
  is recorded as accepted, does NOT produce an `unknown tool` error, and does
  NOT populate `pendingToolFailures`.
- A `state_edit` tool result (e.g. `set_theme_token`) still mirrors onto the
  working site via `applyToolCall` as before.
- A `system_action` server **rejection** is surfaced with the server's error
  message (not `unknown tool`).

Regression scope: existing `chat-driver` / `tools` tests plus the REQ-30 /
REQ-37 transcribe + read-digest UATs.
