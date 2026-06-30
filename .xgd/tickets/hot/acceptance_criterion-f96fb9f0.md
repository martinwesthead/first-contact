---
uid: acceptance_criterion-f96fb9f0
id: AC-826
type: acceptance_criterion
title: Explicit pageId selects the requested draft page
created_by: xgd
created_at: '2026-06-30T06:24:10.671564+00:00'
updated_at: '2026-06-30T06:24:10.671564+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When a `pageId` that matches one of the draft's pages is supplied, the returned digest is for exactly that page (its `previewSource.pageId` equals the requested id).

## Verification
On a draft with multiple pages, invoke the tool with a specific valid `pageId` and assert the returned digest's `previewSource.pageId` equals the requested id.
