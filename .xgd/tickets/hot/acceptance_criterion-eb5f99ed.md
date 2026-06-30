---
uid: acceptance_criterion-eb5f99ed
id: AC-812
type: acceptance_criterion
title: Anthropic is primed with the session tail (>= CHAT_TAIL_CHARS, default 5000),
  not the whole transcript
created_by: xgd
created_at: '2026-06-30T04:29:55.395412+00:00'
updated_at: '2026-06-30T04:29:55.395412+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

For an accepted turn, the server first appends the new user message to the named session, then primes the Anthropic call from the session **tail** rather than the entire transcript. The tail is the contiguous most-recent run of stored messages, selected by walking backward from the newest message and accumulating message content until the combined character length first meets or exceeds `CHAT_TAIL_CHARS` (default `5000`, overridable via the `CHAT_TAIL_CHARS` env value; non-numeric or non-positive values fall back to the default). The selected tail is presented to the model oldest-first (chronological order), restricted to `user`/`assistant` turns. Because the user message is appended before the tail is loaded, the just-sent message is always included in the primed context.

## Verification

Seed a session whose stored messages far exceed the character budget. Set `CHAT_TAIL_CHARS` to a small value and POST a new `userMessage`. Stub the upstream fetch and assert the outgoing Anthropic `messages` array (a) ends with the just-sent user message, (b) contains only the most-recent messages whose cumulative content length first reaches the budget — not the whole transcript — and (c) is ordered oldest-to-newest. Repeat with `CHAT_TAIL_CHARS` unset and assert the 5000-char default applies, and with a non-numeric `CHAT_TAIL_CHARS` and assert it falls back to the default.
