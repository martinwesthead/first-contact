---
uid: acceptance_criterion-3c49fb12
id: AC-801
type: acceptance_criterion
title: Session listing is scoped to one site, newest-activity-first, with limit and
  before-cursor pagination
created_by: xgd
created_at: '2026-06-30T04:15:58.928688+00:00'
updated_at: '2026-06-30T04:15:58.928688+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Listing a site's sessions returns only sessions belonging to that site (sessions
of other sites never appear), ordered by most-recent activity first. A limit
parameter bounds the number of sessions returned, and a before-cursor parameter
returns the next page of sessions whose last-activity precedes the cursor.

## Verification
Create sessions across two sites with differing activity; list site A and assert
the response contains only site A's sessions in most-recent-activity-first
order and none of site B's. Assert a limit returns at most that many sessions,
and that paging with the before-cursor returns the following older page.
