---
uid: acceptance_criterion-e23f2aed
id: AC-673
type: acceptance_criterion
title: Send button is disabled with a CSS-only spinner and aria-busy while a turn
  is in flight
created_by: xgd
created_at: '2026-06-28T22:12:50.035094+00:00'
updated_at: '2026-06-28T22:12:50.035094+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

While a chat turn is in flight (after a send is submitted and before `onSend` settles), the Send button is disabled and shows a CSS-only spinner in place of its "Send" label, with `aria-busy="true"` and a `data-fc-chat-send-busy` attribute set on the button. The spinner is a pure-CSS rotating element (no SVG or image asset), and the button keeps its width so the input row does not reflow when the spinner appears.

## Verification

Render the builder chat panel with an `onSend` that returns a pending (unresolved) promise, trigger a send with non-empty input, and assert the `[data-fc-chat-send]` button is `disabled`, carries `aria-busy="true"` and the `data-fc-chat-send-busy` attribute, and that the "Send" label is hidden while the spinner element is shown. Assert the shipped `apps/control-app/public/builder.html` stylesheet defines the `.fc-chat__send-spinner` rotation rule and the `aria-busy="true"` label/spinner swap.
