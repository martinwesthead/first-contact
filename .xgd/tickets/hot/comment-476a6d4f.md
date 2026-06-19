---
uid: comment-476a6d4f
id: COMMENT-104
type: comment
title: Comment on bug BUG-1
created_by: xgd
created_at: '2026-06-19T20:57:31.300229+00:00'
updated_at: '2026-06-19T20:58:47.055199+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-52f612d1
  kind: chat_transcript
---

<!-- xgd-turn id="1ceb3332-8dad-4aed-a9d8-dedd6ecc63dd-user" -->

<!-- xgd-chat role="user" ts="2026-06-19T20:57:21.386Z" -->
#### You
The chat window was working before the recent changes, it has broken. There is no text entry field and the send button is on the wrong side

<!-- xgd-turn id="1ceb3332-8dad-4aed-a9d8-dedd6ecc63dd-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-19T20:58:47.029Z" -->
#### Claude
I'll investigate the chat window code to find what broke.

Let me check the CSS that styles the chat panel.

I can see the issue. The CSS still references the old `.fc-chat__textarea` (a plain textarea), but the chat-panel was migrated to TipTap with `.fc-chat__editor` and `.fc-chat__editor-content` classes — which have no CSS, so the editor is collapsing to zero width and the send button takes over.

Let me confirm with git history:

Found the root cause. The chat panel was migrated from a `<textarea>` to a TipTap editor in REQ-13, but the CSS in `builder.html` was never updated — the styles still target `.fc-chat__textarea` which no longer exists. The new `.fc-chat__editor` element has no size/flex rules, so it collapses to zero width and the send button visually dominates.

Let me check the existing ticket body and then update the scope.

Body is empty (`(new ticket)`). Let me populate the scope ticket with the diagnosis and proposed fix:

Scope ticket is populated. Before I touch any code, please confirm the diagnosis and fix plan:

**Diagnosis**: REQ-13 swapped the chat input from `<textarea class="fc-chat__textarea">` to a TipTap editor (`.fc-chat__editor` + `.fc-chat__editor-content`), but the CSS in `apps/control-app/public/builder.html` still styles only the old class. With no rules for the new editor element, it collapses to zero size — so the editor is invisible and the Send button visually dominates the row.

**Proposed fix**: CSS-only change in `apps/control-app/public/builder.html`. Replace the `.fc-chat__textarea` rule with rules for `.fc-chat__editor` (flex-grow, min-height, border, background) and `.fc-chat__editor-content` (text colour, padding, focus outline). DOM order in `chat-panel.ts` is already `[ editor ][ send ]`, so no JS changes needed.

**Test plan**: One UAT (`test_UAT_FC_BUG-1_chat_input_visible_and_positioned`) asserting the editor is present + sized, the Send button is to its right, and Send/Cmd-Enter fires `onSend` with typed text.

Shall I proceed with the implementation? Also — do you want me to keep the existing styling palette (dark `#0f172a` background, `#334155` borders, etc.) or freshen it at the same time?

<!-- xgd-chat-end -->