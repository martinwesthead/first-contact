---
uid: acceptance_criterion-a7cb381b
id: AC-400
type: acceptance_criterion
title: ContentValue admits primitives, AssetRef, arrays, and plain objects
created_by: xgd
created_at: '2026-06-25T00:39:27.297593+00:00'
updated_at: '2026-06-25T00:39:27.297593+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

A `ModuleInstance`'s `content` field admits arbitrary nested
values matching `ContentValue` — namely `string`, `number`,
`boolean`, `null`, `AssetRef`, arrays of `ContentValue`, and
plain objects keyed by string mapping to `ContentValue`. This
shape allows modules to declare object-shaped fields (nav-entry
lists, CTA objects, services-grid items, contact-form field
arrays) without an escape hatch.

## Verification

Pass a site whose module `content` includes each `ContentValue`
shape — a string, a number, a boolean, a `null`, an `AssetRef`,
an array of mixed primitives, and a nested object containing a
further nested object — and assert `validateSite()` returns the
success branch.
