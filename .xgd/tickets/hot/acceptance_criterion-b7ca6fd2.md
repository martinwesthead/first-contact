---
uid: acceptance_criterion-b7ca6fd2
id: AC-652
type: acceptance_criterion
title: add_page after_slug controls insertion position
created_by: xgd
created_at: '2026-06-28T20:47:35.176864+00:00'
updated_at: '2026-06-28T20:47:35.176864+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
When add_page is given an `after_slug` naming an existing page (canonical form, e.g. `/`), the new page is inserted immediately after that page in the page order rather than appended last.

## Verification
On a site with pages `/`, `/menu`, `/contact`, apply add_page with `{slug: "about", title: "About", after_slug: "/"}` and assert the resulting page order is `/`, `/about`, `/menu`, `/contact`.
