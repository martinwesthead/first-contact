---
uid: acceptance_criterion-6ba42370
id: AC-720
type: acceptance_criterion
title: Bootstrap seed creates the platform account, the 1st Contact site, and its
  initial revision
created_by: xgd
created_at: '2026-06-29T21:28:32.165474+00:00'
updated_at: '2026-06-29T21:28:32.165474+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
After all migrations are applied to a fresh database, exactly one platform-owned account exists, one site exists with slug `1stcontact` owned by that account, and one revision exists for that site. The site's published pointer references the initial revision, and the site has both a draft definition and a published definition populated.

## Verification
On a freshly-migrated database, query the seeded rows: assert one account row, one site row (slug = `1stcontact`, account = the platform account, non-null draft and published definitions, published pointer set to the initial revision), and one revision row for that site.
