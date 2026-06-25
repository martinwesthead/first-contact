---
uid: acceptance_criterion-4cf85dc4
id: AC-441
type: acceptance_criterion
title: Content validator accepts list-of (with min/max bounds), nested object, and
  enum content shapes
created_by: xgd
created_at: '2026-06-25T01:12:39.926644+00:00'
updated_at: '2026-06-25T01:12:39.926644+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When validating module content against a contentSchema, the framework's content validator accepts and enforces the following shape kinds in addition to primitive types:

- `list-of` — the value must be an array; if `min` is declared, the array length must be ≥ min; if `max` is declared, the array length must be ≤ max; each element is recursively validated against the declared element shape.
- nested `object` — the value must be a plain object; each declared field within the object is recursively validated; required fields must be present.
- `enum` — the value must be one of the declared string values; any other value is rejected with a message naming the accepted set.

Violations identify the offending field via a path and a human-readable message.

## Verification

Construct a module meta whose contentSchema uses each of `list-of` (with min/max), nested `object`, and `enum`. Validate content that conforms — expect acceptance. Validate content that violates each rule (array under min, array over max, wrong primitive in nested-object field, missing required nested field, enum value outside the declared set) — expect rejection, with each violation identifying the relevant field path and an appropriate message.
