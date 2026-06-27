---
uid: acceptance_criterion-287af37d
id: AC-585
type: acceptance_criterion
title: Chat-turn history is persisted to browser storage and restored on builder re-mount
created_by: xgd
created_at: '2026-06-27T00:56:39.715426+00:00'
updated_at: '2026-06-27T00:57:24.407817+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat-turn history is persisted to the operator's browser storage after every chat turn (each user message and the assistant turn it produces, including the structured outcome of any accepted or rejected tool call). When the builder is mounted again against the same storage, the previously recorded chat turns are restored into the chat log instead of starting from an empty log, so the conversation survives a page reload and store re-instantiation.

## Verification

Mount a builder backed by an in-memory storage facility. Drive a sequence of chat turns (e.g. a user prompt that yields an accepted tool call, then a second prompt that yields a rejected tool call surfaced as a structured error). Confirm the storage now contains a serialised chat-turn history reflecting those turns in order. Discard the builder and mount a fresh builder against the same storage. Verify the new builder's chat log is populated from the persisted turns (not empty) and matches the prior conversation, including the accepted and rejected tool-call entries.
