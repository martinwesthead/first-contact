---
uid: acceptance_criterion-913059f5
id: AC-392
type: acceptance_criterion
title: Valid full site exercising every slot validates
created_by: xgd
created_at: '2026-06-25T00:38:35.685549+00:00'
updated_at: '2026-06-25T00:38:35.685549+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

`validateSite(input)` returns the success branch when given a site
that exercises every defined slot: a populated `SiteConfig`
(business name, tagline, contact, hours, integrations passthrough);
the full theme-token superset; a `NavConfig` whose entries cover
all three `NavEntry` target kinds (`page`, `anchor`, `url`);
multiple pages; multiple module instances on a page including
variant, dials, content, and an `AssetRef` with a focal point; and
a populated top-level `assets` array.

## Verification

Pass a fully-populated site fixture covering every shape to
`validateSite()` and assert the result is the success branch.
