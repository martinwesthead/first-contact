---
uid: acceptance_criterion-756954e6
id: AC-422
type: acceptance_criterion
title: Footer renders the optional small-link row when navigation entries are supplied
created_by: xgd
created_at: '2026-06-25T00:57:24.471033+00:00'
updated_at: '2026-06-25T00:57:24.471033+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the footer module with a non-empty list of `links` (navigation entries) produces markup containing a navigation region with one anchor per supplied link, whose visible text matches the entry's label and whose href is resolved from the entry's navigation target. Rendering the footer module with an absent or empty `links` list produces no such navigation region.

## Verification

Render the footer module with two navigation entries (one page target, one url target) and assert the rendered HTML contains a footer navigation region with two anchors whose labels and hrefs match the supplied entries. Render the footer module a second time with no `links` provided and assert the rendered HTML contains no footer navigation region.
