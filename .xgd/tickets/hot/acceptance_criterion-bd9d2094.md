---
uid: acceptance_criterion-bd9d2094
id: AC-556
type: acceptance_criterion
title: Disallowed schemes are rejected with a typed reason
created_by: xgd
created_at: '2026-06-27T00:33:17.634617+00:00'
updated_at: '2026-06-27T00:33:17.634617+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A fetch attempted with a scheme other than `https` or `http` is rejected with a typed `disallowed_scheme` reason carrying the offending scheme as a detail. This covers at minimum `file:`, `gopher:`, `data:`, and `ftp:`.

## Verification

Attempt fetches to a representative URL of each disallowed scheme and assert that each is rejected with reason `disallowed_scheme` and a detail string containing the offending scheme. No outbound network request must occur.
