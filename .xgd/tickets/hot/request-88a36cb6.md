---
uid: request-88a36cb6
id: REQ-32
type: request
title: 'Chat panel: block send while turn in flight (spinner + disabled button)'
created_by: xgd
created_at: '2026-06-20T00:26:31.230463+00:00'
updated_at: '2026-06-20T00:29:03.157951+00:00'
completed_at: null
last_field_updated: priority
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Symptom

The chat panel's Send button stays enabled while an in-flight chat turn is still
running. The operator gets no visual indication that the previous send is still
in progress, and can fire repeat send clicks that race the response.

## Behaviour change

While a chat turn is in flight (between Send click / Cmd+Enter submit and the
moment `onSend` resolves):

1. The Send button displays a spinner in place of the "Send" label.
2. The Send button is disabled — clicks and Cmd+Enter submit are no-ops.
3. The editor stays editable so the operator can type their next message.
4. When the turn settles (resolves or throws), the button returns to "Send"
   and re-enables. If `onSend` throws, the busy state is still cleared so the
   UI does not get stuck.

The turn-in-flight state is owned by the chat panel itself, not by an external
store — `onSend` is async, and the panel tracks the promise it returned.

## UI notes

- Spinner is a CSS-only rotating element; no SVG/asset dependency.
- The button keeps its width so the row does not reflow when the spinner
  appears.
- `aria-busy="true"` is set on the button while in-flight so assistive tech
  reports the state.
- An empty input still no-ops on click — that path returns before the
  busy state is entered.

## Test plan

UATs under `tests/test_UAT_FC_REQ-32_*`:
- Send button is disabled and shows a spinner while `onSend` is pending.
- Click during in-flight state does not fire a second `onSend` call.
- Cmd+Enter during in-flight state does not fire a second `onSend` call.
- Editor remains editable (focusable, accepts input) during in-flight state.
- Button returns to "Send" and re-enables after `onSend` resolves.
- Button returns to "Send" and re-enables after `onSend` rejects.
