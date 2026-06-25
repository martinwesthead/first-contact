---
uid: acceptance_criterion-1b866813
id: AC-484
type: acceptance_criterion
title: Rejected AI tool call leaves site state unchanged and records a structured
  error in the chat log
created_by: xgd
created_at: '2026-06-25T02:00:16.289961+00:00'
updated_at: '2026-06-25T02:00:16.289961+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the chat layer returns a tool call that the four-layer validator rejects — for example, a `set_module_dial` whose value is outside the dial's declared enum — the working site definition is left unchanged, the preview is not advanced, and an assistant chat message is appended carrying a tool-call summary with `accepted: false` and a structured error message naming the offending dial, the offending value, and the allowed enum.

## Verification

Mount a builder against a starter site definition that includes a hero (or other module) instance with a known dial enum (e.g. `size: [sm, md, lg]`). Stub the chat endpoint to return a single `set_module_dial` tool call setting `size` to an out-of-enum value (e.g. `huge`). Run a chat turn. Verify the working site definition's dials for that instance are unchanged. Verify the last chat-history message is an assistant message with one tool-call summary marked `accepted: false`, and that the error string contains the offending dial name, the offending value, and references to the allowed enum members.
