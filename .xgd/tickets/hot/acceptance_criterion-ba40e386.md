---
uid: acceptance_criterion-ba40e386
id: AC-705
type: acceptance_criterion
title: set_nav_pattern sets the site nav pattern and rejects unknown values
created_by: xgd
created_at: '2026-06-28T23:53:37.887393+00:00'
updated_at: '2026-06-28T23:53:37.887393+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `set_nav_pattern` with an allowed pattern ('in-page-anchors', 'top-tabs', 'top-tabs-dropdown', 'hamburger', 'footer-only') sets `site.nav.pattern` and the edit is accepted. A value outside that enum is rejected with a structured validation error and the site is left unchanged.

## Verification
Apply `set_nav_pattern` with an allowed value and assert `site.nav.pattern` reflects it; apply it with an unrecognised value and assert the call is rejected with a structured error naming the offending field/value.