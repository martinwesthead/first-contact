---
uid: acceptance_criterion-92ebf971
id: AC-606
type: acceptance_criterion
title: Kind-tagged system-action results surface to the front-end dispatcher; the
  legacy no-kind read tool does not
created_by: xgd
created_at: '2026-06-27T01:26:13.064651+00:00'
updated_at: '2026-06-27T01:26:13.064651+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
Any successful system action whose result payload carries a `kind` discriminator is surfaced in the chat responses tool-calls list with both its `kind` and its `data`, enabling the front-end to dispatch by kind. The legacy read action that returns no `kind` (get_site_definition) continues to surface its data through the system-actions channel and does NOT appear in the kind-routed tool-calls list. Failed system actions also surface in the tool-calls list so failures can render.

## Verification
In one chat turn trigger both a kind-tagged action (analyze_page) and the no-kind read tool. Assert the kind-tagged result appears in `toolCalls` with `applied.kind` set; assert the no-kind read result is absent from `toolCalls` but present in `systemActions`; assert a failed system action appears in `toolCalls` with `ok:false`.
