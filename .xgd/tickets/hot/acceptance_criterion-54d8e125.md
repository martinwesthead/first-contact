---
uid: acceptance_criterion-54d8e125
id: AC-710
type: acceptance_criterion
title: set_page_metadata updates a page title and merges seoMeta
created_by: xgd
created_at: '2026-06-28T23:53:51.011355+00:00'
updated_at: '2026-06-28T23:53:51.011355+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `set_page_metadata` for an existing page with a `title` and/or `seoMeta` updates the page title and partial-merges the supplied seoMeta fields (omitted seoMeta fields are preserved); the edit is accepted.

## Verification
Apply `set_page_metadata` with a new title and a partial seoMeta, then assert the page's title is updated and the seoMeta reflects supplied fields merged over the prior values.