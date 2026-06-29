---
uid: acceptance_criterion-e0eb95a1
id: AC-723
type: acceptance_criterion
title: Well-formed slugs are accepted by slug validation
created_by: xgd
created_at: '2026-06-29T21:28:52.452884+00:00'
updated_at: '2026-06-29T21:28:52.452884+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
Slug validation accepts a slug that is 3–40 characters long, composed only of lowercase ASCII letters and digits and hyphens, with no leading or trailing hyphen and no consecutive hyphens. Examples that must be accepted: `acme`, `my-bakery`, `a-1-b`.

## Verification
Call the public slug validity check with each well-formed example: assert each returns accepted (true).
