---
uid: acceptance_criterion-5be97b64
id: AC-651
type: acceptance_criterion
title: add_page appends an empty page at the canonical slug
created_by: xgd
created_at: '2026-06-28T20:47:32.376891+00:00'
updated_at: '2026-06-28T20:47:32.376891+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Adding a page with a bare slug (e.g. `menu`) and a title to a single-page site yields a site whose page list has two entries: the original page first, then a new page stored at the canonical slug `/menu` with the supplied title and an empty module list. The new page is appended last when no insertion point is given.

## Verification
Start from a single-page site, apply add_page with `{slug: "menu", title: "Menu"}`, and assert the resulting draft has two pages whose slugs are `/` then `/menu`, the second page's title equals `Menu`, and its modules array is empty.
