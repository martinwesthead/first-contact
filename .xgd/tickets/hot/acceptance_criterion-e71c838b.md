---
uid: acceptance_criterion-e71c838b
id: AC-811
type: acceptance_criterion
title: POST /api/chat rejects a body carrying a history field (400); server is the
  source of truth for transcript history
created_by: xgd
created_at: '2026-06-30T04:29:51.302735+00:00'
updated_at: '2026-06-30T04:29:51.302735+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` is server-authoritative for transcript history: a request body that still carries a `history` field is rejected with HTTP `400` and an error explaining that history is no longer accepted because the server reads the stored session messages. The accepted body is `{sessionId, userMessage, siteDefinition, frameworkCatalog}`; the client never supplies prior turns. Companion validation at the same boundary: a non-`application/json` content type is `400`, a malformed JSON body is `400`, a non-object body is `400`, a missing/empty `sessionId` string is `400`, a missing/empty `userMessage` string is `400`, an unbound `CLAUDE_API_KEY` is `500`, and a missing site database binding is `500`.

## Verification

POST a body containing a `history` field (alongside otherwise-valid fields) and assert the response status is `400` and no upstream Anthropic request is made. POST a body omitting `sessionId` (or with an empty string) and assert `400`; likewise for an empty `userMessage`. POST with a `text/plain` content type and assert `400`. Confirm a well-formed `{sessionId, userMessage, siteDefinition, frameworkCatalog}` body for an existing session is accepted (does not 400 on contract grounds).
