---
uid: acceptance_criterion-ef25c385
id: AC-814
type: acceptance_criterion
title: First user turn auto-derives and persists a one-line session title; later turns
  do not regenerate it
created_by: xgd
created_at: '2026-06-30T04:30:03.309283+00:00'
updated_at: '2026-06-30T04:30:03.309283+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

On a session's **first** user turn (the session had zero messages when the request arrived), the server derives a one-line session title from that user message — whitespace collapsed to single spaces and trimmed, and truncated to 60 characters with a trailing ellipsis when longer — and persists it to the session. Subsequent turns on the same session do not regenerate or overwrite the title. A user message that collapses to an empty string yields no title update.

## Verification

POST the first `userMessage` to a freshly created (zero-message) session and assert the session's stored `title` afterward equals the collapsed/truncated derivation of that message (e.g. a long message is cut to 60 chars with an ellipsis; internal whitespace is normalised). POST a second turn with a different message and assert the title is unchanged. Create another session and POST a first message that is only whitespace and assert no title is written.
