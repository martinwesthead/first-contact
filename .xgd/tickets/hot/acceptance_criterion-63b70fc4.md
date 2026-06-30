---
uid: acceptance_criterion-63b70fc4
id: AC-796
type: acceptance_criterion
title: Full-text search over chat messages is scoped to a single site and never returns
  another site's messages
created_by: xgd
created_at: '2026-06-30T04:07:18.170205+00:00'
updated_at: '2026-06-30T04:07:18.170205+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
A full-text search over chat message content can be constrained to a single
site so that it returns only messages belonging to sessions of that site.
Given the same matching content present under two different sites, a search
scoped to the first site returns only the first site's message and none of the
second site's; a search scoped to a site that has no matching content returns
no rows.

## Verification
Seed two sites, each with a session containing a message that shares a common
search term. Run a site-scoped full-text search for site A and assert only site
A's message is returned; repeat for site B. Run a scoped search for a term that
exists only under another site and assert zero rows are returned.
