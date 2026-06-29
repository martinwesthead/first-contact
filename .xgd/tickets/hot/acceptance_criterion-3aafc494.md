---
uid: acceptance_criterion-3aafc494
id: AC-735
type: acceptance_criterion
title: Rejected tool calls surface in a dismissable failure banner and re-inject as
  a synthetic system message on the next turn
created_by: xgd
created_at: '2026-06-29T22:27:11.759286+00:00'
updated_at: '2026-06-29T22:27:11.759286+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

Rejected tool calls from a turn are collected into the builder's pending-failure buffer and surfaced two ways. (1) A failure banner above the chat message list is hidden when there are no pending failures and is revealed when one or more land; it lists each failed tool by name with its error and offers a Dismiss control that clears the buffer and hides the banner. (2) On the next outbound chat turn, if the buffer is non-empty, a synthetic `system` chat message describing the failures (naming each failed tool, its arguments, and its error) is prepended to the chat history — so it persists in the transcript and is sent to the AI — and the buffer is then cleared, allowing the AI to self-correct without the operator restating the failure. A turn whose tool calls are all accepted leaves the buffer empty.

## Verification

Banner: render the chat panel against a store with no pending failures and assert the banner is hidden; record two rejected tool calls and assert the banner is revealed with one row per failed tool (carrying the tool name and its error text); click Dismiss and assert the banner is hidden again and the pending-failure buffer is empty. Re-injection: run a turn whose stubbed `/api/chat` response rejects a tool call and assert the rejection is recorded in the pending-failure buffer; run a second turn and assert a `system` message naming the failed tool and mentioning failure was prepended to the chat history and sent, and that the buffer is then empty. Separately, run a turn whose tool calls are all accepted and assert the buffer stays empty.
