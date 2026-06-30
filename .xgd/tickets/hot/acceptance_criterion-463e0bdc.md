---
uid: acceptance_criterion-463e0bdc
id: AC-798
type: acceptance_criterion
title: Reference docs persist with title/summary/contents/body/kind, are full-text
  searchable over title, summary, and body, and are filterable by kind
created_by: xgd
created_at: '2026-06-30T04:07:39.069569+00:00'
updated_at: '2026-06-30T04:07:39.069569+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1e174b7c
  kind: behavior
  regression_only: false
---

## Criterion
A reference document can be stored with a unique slug, a title, a summary, a
structured table of contents, a body, and a kind, and read back with those
fields intact. The document is full-text searchable independently over its
title, its summary, and its body — a term present in any one of those fields
makes the document findable. When a document's body changes, search reflects
the new body and not the old; when a document is deleted, it no longer appears
in search results. Documents can be listed/filtered by kind via a dedicated
access path.

## Verification
Insert a reference doc and read it back, asserting field round-trip. Run
full-text queries for terms that appear only in the title, only in the summary,
and only in the body, asserting each returns the doc. Update the body and
confirm search matches the new term and not the old; delete the doc and confirm
it is no longer returned. Query by kind and confirm the kind index is used.
