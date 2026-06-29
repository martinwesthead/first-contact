---
uid: acceptance_criterion-2799f48c
id: AC-730
type: acceptance_criterion
title: Assistant responses stream progressively into the chat; an error event surfaces
  a sorry-message bubble
created_by: xgd
created_at: '2026-06-29T22:01:39.269016+00:00'
updated_at: '2026-06-29T22:01:39.269016+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

Assistant responses stream into the chat progressively rather than appearing as a single block on turn completion. At turn start an empty assistant message bubble is appended to the chat log, and it grows as each `token` Server-Sent Event arrives from `/api/chat` — the visible text lengthens token-by-token while the model is still generating. On the `done` event the bubble is committed with the final text and its structured tool calls. If a stream `error` event arrives (or the chat endpoint returns a non-2xx response), the in-flight bubble is replaced with a `Sorry — …` message rather than being left empty.

## Verification

Drive the chat panel against a stubbed `/api/chat` SSE response that emits several `token` events (`"Hel"`, `"lo"`, …) before `done`. Assert the assistant bubble's text content grows across successive `token` events (it is non-final and lengthening, not a single block that appears only at `done`), and that after `done` the bubble holds the joined final text. Separately, drive a response that emits an `error` event (and one that returns a non-2xx status) and assert the in-flight assistant bubble is replaced with a `Sorry — …` message.
