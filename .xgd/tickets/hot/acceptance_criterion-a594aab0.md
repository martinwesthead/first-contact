---
uid: acceptance_criterion-a594aab0
id: AC-483
type: acceptance_criterion
title: Accepted AI tool call advances the working site and re-renders the preview
created_by: xgd
created_at: '2026-06-25T02:00:02.028782+00:00'
updated_at: '2026-06-25T02:00:02.028782+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the chat layer returns a tool call that the four-layer validator accepts — i.e. the call's catalog references resolve (module type/version present, dial/variant/theme-token names declared) and the resulting site definition passes the schema — the working site is advanced to the post-tool-call value, the preview iframe is re-rendered against the new site, and an assistant message is appended to the chat log carrying the tool-call summary with `accepted: true`.

## Verification

Mount a builder against a starter site definition with at least one module instance and a known initial theme token (e.g. `palette.primary`). Stub the chat endpoint to return a single `set_theme_token` tool call setting `palette.primary` to a new value. Run a chat turn. Verify the working site definition contains the new token value, the assistant message at the end of the chat history records the tool call with `accepted: true`, and the preview iframe's rendered HTML reflects the new value (i.e. the token-derived CSS or attribute matches the new value, not the original).
