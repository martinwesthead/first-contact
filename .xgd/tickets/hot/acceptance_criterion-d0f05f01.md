---
uid: acceptance_criterion-d0f05f01
id: AC-769
type: acceptance_criterion
title: Published contrast-ratio helper computes the WCAG relative-luminance ratio
  for a hex foreground/background pair
created_by: xgd
created_at: '2026-06-29T23:53:16.817433+00:00'
updated_at: '2026-06-29T23:53:16.817433+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

**The published contrast-ratio helper returns the WCAG relative-luminance contrast ratio for a foreground/background hex pair.**

Given two hex colours, the framework's published contrast-ratio helper
computes the WCAG 2.x contrast ratio `(L_lighter + 0.05) / (L_darker + 0.05)`
using the relative-luminance formula. It accepts 3-digit shorthand, 6-digit,
and 8-digit hex (with or without a leading `#`).

## Verification

Invoke the published contrast-ratio helper with known fixtures: black on
white returns 21:1; a mid-grey pair returns a value below 4.5:1; and a
3-digit shorthand hex (e.g. `#fff`) yields the same ratio as its expanded
6-digit form. An unparseable hex string is rejected with an error.
