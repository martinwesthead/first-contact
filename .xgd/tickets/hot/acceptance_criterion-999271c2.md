---
uid: acceptance_criterion-999271c2
id: AC-721
type: acceptance_criterion
title: Seeded 1st Contact site definition validates as a well-formed Site
created_by: xgd
created_at: '2026-06-29T21:28:34.849818+00:00'
updated_at: '2026-06-29T21:28:34.849818+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
The site definition stored by the bootstrap seed (both its draft and published definition payloads) parses and validates as a well-formed Site per the Site Definition Schema validator (CAP-32) — it is real site content, not a placeholder.

## Verification
Read the seeded site's draft and published definition payloads from the database, parse them, and run them through the Site schema validator: assert validation passes for both.
