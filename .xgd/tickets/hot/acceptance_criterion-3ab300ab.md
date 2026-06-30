---
uid: acceptance_criterion-3ab300ab
id: AC-810
type: acceptance_criterion
title: Appending a message validates role and content and rejects unknown sessions
created_by: xgd
created_at: '2026-06-30T04:17:16.270332+00:00'
updated_at: '2026-06-30T04:17:16.270332+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Appending a message accepts a role drawn from the recognized set
(user, assistant, system, tool_result), string content, and optional structured
tool-call data. A request with a role outside the recognized set, or with
non-string content, is rejected with a client error and no message is appended.
An append request targeting a session that does not exist is rejected as
not-found.

## Verification
Append with each valid role and assert success. Append with an unrecognized role
and with non-string content and assert client-error responses with the session's
message count unchanged. Append to a non-existent session id and assert a
not-found response.
