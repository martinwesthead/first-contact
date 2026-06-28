---
uid: acceptance_criterion-8ed2a92b
id: AC-713
type: acceptance_criterion
title: set_page_metadata requires at least one updatable field
created_by: xgd
created_at: '2026-06-28T23:53:59.068284+00:00'
updated_at: '2026-06-28T23:53:59.068284+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
A `set_page_metadata` call that supplies only `slug` (none of `title`, `new_slug`, `seoMeta`) is rejected with a structured error requiring at least one updatable field; an unknown page slug is also rejected.

## Verification
Apply `set_page_metadata` with only `slug` and assert rejection requiring a field; apply it for a non-existent slug and assert rejection identifying the unknown page.