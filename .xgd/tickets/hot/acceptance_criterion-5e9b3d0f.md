---
uid: acceptance_criterion-5e9b3d0f
id: AC-722
type: acceptance_criterion
title: 'Site slugs are globally unique: a duplicate slug insert is rejected'
created_by: xgd
created_at: '2026-06-29T21:28:37.673436+00:00'
updated_at: '2026-06-29T21:28:37.673436+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
A site slug is unique across the entire platform namespace. Inserting a second site row with a slug already held by an existing site fails with a uniqueness violation; the duplicate row is not persisted.

## Verification
Insert a site with a given slug, then attempt to insert a second site with the same slug: assert the second insert raises a uniqueness-constraint error and that only the first site persists.
