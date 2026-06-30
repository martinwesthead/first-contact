---
uid: acceptance_criterion-d9678bec
id: AC-800
type: acceptance_criterion
title: Creating a session under a site returns the created session and it appears
  in that site's listing
created_by: xgd
created_at: '2026-06-30T04:15:54.685721+00:00'
updated_at: '2026-06-30T04:15:54.685721+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
A request to create a chat session under a given site succeeds and returns the
newly created session, including a server-assigned identifier, the site it
belongs to, and a zero message count. An optional title may be supplied; when
omitted, the returned session has no title. The created session is subsequently
returned by that site's session listing.

## Verification
Create a session for a site (once with a title, once without); assert the
success response carries a non-empty identifier, the requested site, and a
message count of zero, and that the title is present or empty matching the
request. Then list the site's sessions and assert the created session appears.
