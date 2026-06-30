---
uid: acceptance_criterion-d1702dde
id: AC-807
type: acceptance_criterion
title: Listing reference docs returns each doc's slug, title, summary, and kind
created_by: xgd
created_at: '2026-06-30T04:16:53.023177+00:00'
updated_at: '2026-06-30T04:16:53.023177+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Requesting the reference-doc list returns an entry per reference document, each
carrying the document's slug, title, summary, and kind. When no reference docs
exist, an empty list is returned (not an error).

## Verification
With reference docs present, request the list and assert each entry contains
slug, title, summary, and kind for the stored docs. With no docs present, assert
the response is a successful empty list.
