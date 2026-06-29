---
uid: acceptance_criterion-8d7751e8
id: AC-725
type: acceptance_criterion
title: Reserved slugs are rejected as unavailable to operators
created_by: xgd
created_at: '2026-06-29T21:28:57.752923+00:00'
updated_at: '2026-06-29T21:28:57.752923+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
A reserved set of platform-owned slugs cannot be claimed by an operator. The reserved-slug check reports `true` for reserved names — including `api`, `www`, `admin`, `preview`, and `1stcontact` — independent of case.

## Verification
Call the public reserved-slug check with each reserved name (and a case variant): assert each reports reserved. Also assert a non-reserved well-formed slug reports not-reserved.
