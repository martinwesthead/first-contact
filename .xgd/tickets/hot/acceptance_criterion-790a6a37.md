---
uid: acceptance_criterion-790a6a37
id: AC-817
type: acceptance_criterion
title: Chat-session boot or mid-send failures surface as an in-panel system message
  naming the site
created_by: xgd
created_at: '2026-06-30T04:43:40.216055+00:00'
updated_at: '2026-06-30T04:43:40.216055+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the builder cannot establish or load the active chat session — during boot, or mid-send when no session can be established — it surfaces the failure as a system message inside the chat panel that names the affected site and includes the underlying error text, instead of leaving the chat panel silently broken or only logging the failure to the console. The message is rendered as plain text in the chat log.

## Verification

Drive a boot in which the chat backend is unavailable (e.g. the session-establishment request fails). Confirm an in-panel system message appears in the chat log, naming the site whose chat could not be established and including the error detail, rather than an empty/broken panel with only a console warning. Trigger a send before a session exists while the backend still fails and confirm the same in-panel system error is appended rather than the turn silently failing.
