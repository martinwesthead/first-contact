---
uid: acceptance_criterion-1333e17f
id: AC-712
type: acceptance_criterion
title: set_page_metadata rejects a slug collision and an invalid slug
created_by: xgd
created_at: '2026-06-28T23:53:56.366046+00:00'
updated_at: '2026-06-28T23:53:56.366046+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
`set_page_metadata` rejects a `new_slug` that collides with an existing page's slug, and rejects a `new_slug` that does not match the slug format (including a leading-slash path). Rejected edits leave the site unchanged.

## Verification
Apply `set_page_metadata` with a `new_slug` equal to another page's slug (assert rejected for collision) and with a malformed slug such as 'Bad Slug' or '/menu' (assert rejected for invalid format).