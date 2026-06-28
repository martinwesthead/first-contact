---
uid: acceptance_criterion-a3dc5955
id: AC-706
type: acceptance_criterion
title: set_nav_entries replaces the nav entries wholesale
created_by: xgd
created_at: '2026-06-28T23:53:40.494972+00:00'
updated_at: '2026-06-28T23:53:40.494972+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `set_nav_entries` with a valid `entries` array (each entry `{ label, target }`, target one of page/anchor/url) replaces `site.nav.entries` in full — prior entries do not survive — and the edit is accepted.

## Verification
Seed a site with existing nav entries, apply `set_nav_entries` with a different valid list, and assert the resulting `site.nav.entries` equals exactly the supplied list.