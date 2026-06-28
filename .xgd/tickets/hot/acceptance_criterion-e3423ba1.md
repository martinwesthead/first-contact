---
uid: acceptance_criterion-e3423ba1
id: AC-653
type: acceptance_criterion
title: add_page rejects an invalid slug format
created_by: xgd
created_at: '2026-06-28T20:47:37.878433+00:00'
updated_at: '2026-06-28T20:47:37.878433+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Adding a page whose slug does not match the allowed slug pattern (lowercase alphanumerics and internal hyphens only) is rejected with a structured failure whose message references the slug, and the site draft is left unchanged.

## Verification
Apply add_page with a malformed slug such as `Bad Slug!`; assert the result is a failure whose error message mentions the slug, and that the page list is unchanged.
