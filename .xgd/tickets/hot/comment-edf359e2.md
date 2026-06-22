---
uid: comment-edf359e2
id: COMMENT-140
type: comment
title: Comment on request REQ-24
created_by: xgd
created_at: '2026-06-22T19:10:23.536706+00:00'
updated_at: '2026-06-22T19:30:35.283944+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-bd042463
  kind: chat_transcript
---

<!-- xgd-turn id="3406037e-a65a-4a0c-b928-8cccf7415e9f-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T19:09:34.515Z" -->
#### You
Ticket 23 is done, is this ready for free coding?

<!-- xgd-turn id="3406037e-a65a-4a0c-b928-8cccf7415e9f-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-22T19:10:28.777Z" -->
#### Claude
Yes — REQ-24 is ready for free coding. Verified:

**REQ-23 is done**: Status `free_coded`, commit `b6dd188` on `xgd-working`. Migrations land:
- `0006_create_chat_sessions.sql`
- `0007_create_chat_messages.sql` (with FTS5 + AI/AD/AU triggers)
- `0008_create_reference_docs.sql` (with FTS5 + triggers)

DB types (`ChatSessionRecord`, `ChatMessageRecord`, `ReferenceDocRecord`) live in `packages/site-schema/src/db-types.ts`.

**REQ-24 ticket state**:
- Status: `draft` (correct starting point — never `ready_to_implement` for free-coded work)
- Body is fully populated with scope, AC, and test plan — no need to redraft
- Story points: 5 (within the ≤20 cap)
- Existing `apps/control-app/src/chat.ts` is the refactor target — current `ChatRequestBody.history` field is exactly what the REQ removes

**One thing to flag** (not a blocker): REQ-23 is at `free_coded`, not yet `free_and_reconciled`. The matrix doesn't describe the schema yet — but the migrations *are* committed to `xgd-working`, which is what REQ-24's code will run against. The two will reconcile in order (REQ-23 first, then REQ-24) per the temporal-ordering rule. Free-coding REQ-24 now is fine.

Want to proceed? Next step would be to flip REQ-24 from `draft` → `in_progress` (optional) and start implementing the migrations test fixture + the first endpoint.

<!-- xgd-turn id="8fad2c35-ce03-41d9-894f-24f65128fd34-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T19:30:27.217Z" -->
#### You
Please go ahead

<!-- xgd-chat-end -->