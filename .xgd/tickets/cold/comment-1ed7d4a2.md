---
uid: comment-1ed7d4a2
id: COMMENT-112
type: comment
title: Comment on request REQ-32
created_by: xgd
created_at: '2026-06-20T00:27:57.356488+00:00'
updated_at: '2026-06-20T00:34:42.041093+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-88a36cb6
  kind: chat_transcript
---

<!-- xgd-turn id="db05f3ee-0890-4d43-9e4a-66b63c55a077-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T00:27:50.052Z" -->
#### You
Chat UI needs to block with clear indication: send button shows a spinner. text can be written in the text box but the send button does not work until the next message can be sent

<!-- xgd-turn id="db05f3ee-0890-4d43-9e4a-66b63c55a077-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T00:34:41.995Z" -->
#### Claude
I'll scope this on REQ-32 first. Let me read the ticket and find the current chat UI implementation.

Now let me look at how the chat panel is wired up to find the onSend handler and check related CSS/spa.

Let me check the existing chat input/markdown tests to understand the test patterns used.

The current `chat-panel.ts` has `submit()` which awaits `onSend` but doesn't track or expose the in-flight state. The button is always enabled. I'll scope the ticket with the spec, then implement.

Ticket scoped. Now implementing the change in `chat-panel.ts`, adding spinner CSS to `builder.html`, and writing UATs.

Now the CSS in `builder.html` — add spinner styles and disabled state.

Now write the UATs. Six test files matching the test plan.

Also adding a test that the spinner CSS rules exist in `builder.html` (matching the BUG-1 pattern).

Now let me check the package exports include `createChatPanel` and run the tests.

Good. Let me run the new tests now.

All 10 tests pass but the reject test triggers an unhandled-rejection warning. Need to attach the catch handler before triggering the rejection.

The unhandled rejection actually originates from the panel's own `void submit()` discarding the promise. Let me fix the source: catch rejections at the handler so they don't escape (busy-state cleanup is already in the finally).

10/10 passing, no unhandled errors. Now the adjacent regression scope — BUG-1 chat-input CSS tests and REQ-13 chat input tests should still be green.

All adjacent tests still green. Now bumping version and committing.

Version bump is stubbed in this repo. Let me check how the most recent free-coded commit handled it.

I'll bump `package.json` 0.0.9 → 0.0.10 (the established convention here) and rebuild the builder SPA bundle since I changed `chat-panel.ts`.

Bundle rebuilt. Now staging files and committing.

Now move the ticket to `free_coded` and record story points.

Ticket is at `free_coded`. Now recording story points.

The auto-commit machinery ran between my code commit and the gate command — the ticket got the wrong SHA. The correct code commit is `749ef9b`. Fixing.

REQ-32 is at `free_coded` with the correct code commit, story_points=1, and a body that reflects what landed.

**Summary**

- **What changed**: `packages/builder-ui/src/components/chat-panel.ts` now tracks an internal `busy` flag. While `onSend` is in flight the Send button is disabled, shows `aria-busy="true"`, and renders a CSS-only spinning border in place of the "Send" label. Cmd/Ctrl+Enter no-ops while busy; the editor stays editable. A `finally` guarantees the busy state clears even when `onSend` throws, and a `.catch` on the dispatched promise prevents unhandled rejections on the page. CSS for the spinner, the aria-busy label/spinner swap, and the disabled state were added to `apps/control-app/public/builder.html`.
- **Tests**: seven UATs in `tests/test_UAT_FC_REQ-32_*` cover disabled+aria-busy during pending, click-repeat suppression, Cmd+Enter-repeat suppression, editor still editable, reset after resolve, reset after reject, and the CSS contract in `builder.html`. All pass; adjacent BUG-1 / REQ-13 / REQ-8 / REQ-22 chat tests remain green.
- **What's next**: ticket is parked at `free_coded`. Promote to `ready_to_reconcile` when you've eyeballed it in the live builder.

<!-- xgd-chat-end -->