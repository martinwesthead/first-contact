---
uid: acceptance_criterion-287af37d
id: AC-585
type: acceptance_criterion
title: Chat-turn history is server-resident and restored from the session API tail
  on builder re-mount
created_by: xgd
created_at: '2026-06-27T00:56:39.715426+00:00'
updated_at: '2026-06-30T05:43:58.026399+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The chat-turn history is server-resident: every chat turn (each user message and the assistant turn it produces, including the structured outcome of any accepted or rejected tool call) is persisted on the server in D1, not held in an in-memory-only array and not stored as a transcript in the operator's browser storage. When the builder is mounted again against the same backend and browser, the chat log is restored from the server by loading the active session's most-recent messages (the session tail) through the chat API and rendering them, instead of starting from an empty log or rehydrating an in-memory copy. The identifier of the active chat session is persisted to the operator's browser storage keyed by the site id, so a reload returns the operator to the same conversation for that site.

## Verification

Mount a builder against a backend whose active session for the site already holds a sequence of prior turns (e.g. a user prompt that yielded an accepted tool call, then a prompt that yielded a rejected tool call surfaced as a structured error). Confirm the chat log is populated by loading that session's tail from the chat API (a tail-load request is issued and its messages render in order, including the accepted and rejected tool-call entries) rather than from an in-memory array or a serialized browser-storage transcript. Reload the builder and confirm the same session is reactivated (its id read back from browser storage, keyed by the site) and its tail is restored from the server, not an empty log.