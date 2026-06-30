---
uid: acceptance_criterion-c40fe384
id: AC-808
type: acceptance_criterion
title: Reading a reference doc by slug returns its full content; unknown slug is not-found
created_by: xgd
created_at: '2026-06-30T04:16:57.135512+00:00'
updated_at: '2026-06-30T04:16:57.135512+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Requesting a reference doc by its slug (without a section) returns the full
document: slug, title, summary, table of contents, and complete body. Requesting
a slug that does not exist is rejected as not-found.

## Verification
Seed a reference doc, request it by slug with no section, and assert the response
contains the slug, title, summary, table of contents, and the full body.
Request a non-existent slug and assert a not-found response.
