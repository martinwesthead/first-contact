---
uid: comment-903627f9
id: COMMENT-136
type: comment
title: Comment on request REQ-25
created_by: xgd
created_at: '2026-06-22T18:08:26.910800+00:00'
updated_at: '2026-06-22T18:08:26.910800+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-6f244e88
  kind: chat_transcript
---

<!-- xgd-turn id="0ab615cb-f3fd-4d90-a1b9-cff1e10f552b-user" -->

<!-- xgd-chat role="user" ts="2026-06-22T18:07:54.588Z" -->
#### You
Please read this ticket and let me know if you understand it well enough to free code it. In particular I want to check in on context size - when the chat session grows too big the responses slow and fail. In XGD we had a very simple fix - once context exceeds a limit we start a new session seeded with (1) essential docs and (2) the last part of the transcript that has grown too big (3) a tool is provided to let the AI read the session in case it needs to refer to aspects. How much of this ware we implementing? Perhaps this is a new ticket?

<!-- xgd-chat-end -->