---
uid: acceptance_criterion-bf201b76
id: AC-396
type: acceptance_criterion
title: Non-hex value in a palette color slot is rejected
created_by: xgd
created_at: '2026-06-25T00:38:57.900771+00:00'
updated_at: '2026-06-25T00:38:57.900771+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

Every palette slot must hold a hex color string matching
`#rgb`, `#rrggbb`, or `#rrggbbaa`. Any other string format (named
color, `rgb(...)`, `hsl(...)`, malformed hex) causes
`validateSite()` to return the failure branch with an error whose
JSON-pointer path names the offending palette slot.

## Verification

Set a palette slot (e.g. `theme.palette.primary`) to a non-hex
string on an otherwise valid site, call `validateSite()`, and
assert the failure branch is returned with an error pointing at
the offending slot.
