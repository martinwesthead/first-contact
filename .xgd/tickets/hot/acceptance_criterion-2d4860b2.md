---
uid: acceptance_criterion-2d4860b2
id: AC-724
type: acceptance_criterion
title: Malformed slugs are rejected by slug validation
created_by: xgd
created_at: '2026-06-29T21:28:55.105277+00:00'
updated_at: '2026-06-29T21:28:55.105277+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
Slug validation rejects any slug that violates the format rules: empty, shorter than 3 chars, longer than 40 chars, containing uppercase letters, containing characters outside lowercase-letters/digits/hyphen, having a leading or trailing hyphen, or containing consecutive hyphens.

## Verification
Call the public slug validity check with a representative of each malformed category (empty, too short, too long, uppercase, special character, leading hyphen, trailing hyphen, consecutive hyphens): assert each returns rejected (false).
