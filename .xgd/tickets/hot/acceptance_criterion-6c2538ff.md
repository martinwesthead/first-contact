---
uid: acceptance_criterion-6c2538ff
id: AC-655
type: acceptance_criterion
title: add_page rejects an unknown after_slug
created_by: xgd
created_at: '2026-06-28T20:47:56.187716+00:00'
updated_at: '2026-06-28T20:47:56.187716+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Adding a page with an `after_slug` that names no existing page is rejected with a structured failure referencing the missing after_slug, and the page list is left unchanged.

## Verification
Apply add_page with `{slug: "menu", title: "Menu", after_slug: "nonexistent"}` and assert the result is a failure whose message mentions after_slug / not found, and no page was added.
