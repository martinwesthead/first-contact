---
uid: comment-476a6d4f
id: COMMENT-104
type: comment
title: Comment on bug BUG-1
created_by: xgd
created_at: '2026-06-19T20:57:31.300229+00:00'
updated_at: '2026-06-19T21:07:59.163609+00:00'
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

<!-- xgd-turn id="4202cc11-3bdd-48e6-a20b-7a7ea995e378-user" -->

<!-- xgd-chat role="user" ts="2026-06-19T21:01:26.936Z" -->
#### You
please fix it

<!-- xgd-turn id="4202cc11-3bdd-48e6-a20b-7a7ea995e378-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-19T21:06:56.884Z" -->
#### Claude
Writing the RED UAT first. Since the bug is purely in static CSS in `builder.html` (jsdom doesn't lay out flexbox so geometric assertions are meaningless), the UAT parses the CSS in the served shell and asserts the new rules exist while the dead rule is gone.

Now run the test to confirm RED.

Three failing as expected (RED). Now applying the GREEN CSS fix.

Now verify GREEN and run nearby tests for regression.

GREEN. Run the broader chat & builder tests to confirm no regression.

All 37 chat/builder tests pass. Now commit and update the ticket.

I need to bump the version manually as part of this free-coding cycle. Let me bump the patch version and create an additional commit.

Ticket is now `free_coded` with both commit SHAs. Let me verify and wrap up.

Fix complete.

**Root cause**: REQ-13 swapped the chat input from `<textarea class="fc-chat__textarea">` to a TipTap editor (`.fc-chat__editor` + `.fc-chat__editor-content`), but `apps/control-app/public/builder.html` still styled only the dead `.fc-chat__textarea` selector — so the new editor wrapper collapsed to zero size and the Send button visually dominated the row.

**Fix**: CSS-only change in `apps/control-app/public/builder.html` — dropped the orphan rule, added `.fc-chat__editor` (flex: 1 1 auto, dark background, border, focus-within highlight) and `.fc-chat__editor-content` (min-height 60px, max-height 200px, padding, light text colour, no outline). Pinned `.fc-chat__send` to `align-self: flex-end` so it sits cleanly to the right of a multi-line editor.

**Verification**: New UAT `test_UAT_FC_BUG-1_chat_input_visible_and_positioned` (4 tests) passes. All 37 surrounding REQ-8 + REQ-13 chat/builder tests still pass.

**Commits**:
- `828caf2` fix(builder-ui): restore chat input visibility — CSS for TipTap editor (BUG-1) [FREE-CODED]
- `e76cfbb` chore: bump version 0.0.2 → 0.0.3 [FREE-CODED]

BUG-1 is now `status: free_coded` with both SHAs and `version: 0.14.1235` recorded.

<!-- xgd-turn id="9985f209-ca8c-49d2-a216-1eb15db835ee-user" -->

<!-- xgd-chat role="user" ts="2026-06-19T21:07:44.384Z" -->
#### You
is any installation required?

<!-- xgd-turn id="9985f209-ca8c-49d2-a216-1eb15db835ee-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-19T21:07:59.135Z" -->
#### Claude
No installation required. The fix is purely a CSS edit inside the static `apps/control-app/public/builder.html` shell — no new dependencies, no new TipTap extensions, no SPA bundle changes.

What you need depending on how you're running it:

- **`wrangler dev` running locally**: just refresh the browser (hard refresh — `Cmd-Shift-R` — to bust the cache on `builder.html`). The static-asset server picks up the file directly from disk.
- **Deployed to Cloudflare**: redeploy the control-app (`pnpm --filter control-app deploy` or however you normally ship it). The bundled `builder.js` is unchanged, so this is just a static-asset re-upload.
- **Production cache**: if you have a CDN cache on `/builder.html`, you may need to purge it or wait for TTL.

Quick sanity check: do you want me to confirm by starting `wrangler dev` and visiting `/builder` to see the editor render?

<!-- xgd-chat-end -->