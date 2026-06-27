---
uid: acceptance_criterion-b548d1fa
id: AC-602
type: acceptance_criterion
title: Robots.txt disallow blocks analysis with a typed failure naming the origin
created_by: xgd
created_at: '2026-06-27T01:26:02.369006+00:00'
updated_at: '2026-06-27T01:26:02.369006+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When robots.txt for the target origin disallows automated fetching, the analyze action returns a typed failure whose message identifies the disallowing origin and the rejected URL, and the page body is never fetched.

## Verification
Configure the robots cache so the target origin disallows the path, then analyze that URL. Assert a failure result whose error references robots.txt and the origin, and that no page-body fetch occurred.
