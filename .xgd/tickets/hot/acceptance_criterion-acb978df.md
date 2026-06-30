---
uid: acceptance_criterion-acb978df
id: AC-805
type: acceptance_criterion
title: Editing a session title updates and returns the session; empty title and unknown
  session are rejected
created_by: xgd
created_at: '2026-06-30T04:16:27.474942+00:00'
updated_at: '2026-06-30T04:16:27.474942+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Editing a session's title with a non-empty value succeeds and returns the
session with the updated title. A request with an empty or non-string title is
rejected with a client error and the title is unchanged. A title-edit request
for a session that does not exist is rejected as not-found.

## Verification
Edit an existing session's title and assert the response shows the new title and
a re-read confirms it. Send an empty title and assert a client-error response
with the title unchanged. Edit a non-existent session id and assert a not-found
response.
