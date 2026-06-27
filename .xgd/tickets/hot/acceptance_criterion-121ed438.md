---
uid: acceptance_criterion-121ed438
id: AC-584
type: acceptance_criterion
title: tool_result kind to renderer dispatcher with markdown fallback and danger card
  on failure
created_by: xgd
created_at: '2026-06-27T00:55:24.093775+00:00'
updated_at: '2026-06-27T00:55:24.093775+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

Structured `tool_result` outcomes in the chat log are routed through a kind→renderer dispatcher: a result tagged with a `kind` that has a registered renderer is rendered by that renderer; a successful result with an unknown `kind` or no `kind` falls back to a card whose body is the result `summary` rendered as markdown; and a failed result (`ok: false`) renders as a danger-toned card surfacing the validation message. Downstream features register their per-kind renderers with the dispatcher rather than the chat panel hard-coding each one.

## Verification

Register a stub renderer under a test `kind` and dispatch a successful result carrying that `kind`; assert the stub renderer's output is what gets appended. Dispatch a successful result with no registered `kind`; assert the fallback renders a card whose body is the markdown-rendered `summary`. Dispatch a failed result; assert a danger-toned card is rendered showing the validation message. Confirm an unregistered `kind` does not throw and uses the markdown fallback.
