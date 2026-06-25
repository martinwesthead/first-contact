---
uid: acceptance_criterion-a5b59a1f
id: AC-409
type: acceptance_criterion
title: A CSS font-family declaration resolves to its vetted font spec, case-insensitively
  and ignoring surrounding quotes
created_by: xgd
created_at: '2026-06-25T00:49:55.945497+00:00'
updated_at: '2026-06-25T00:49:55.945497+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

Given a CSS font-family declaration (which may be a comma-separated stack
with the primary family first, optionally surrounded by single or double
quotes), the framework resolves the declaration to its matching entry in
the vetted shortlist by matching the *first* family name, ignoring
surrounding quotes and case.

If the declaration's primary family is not on the shortlist, the lookup
returns no result (rather than raising an error).

## Verification

- Look up a declaration whose primary family is on the shortlist
  (e.g. `"'Manrope', system-ui, sans-serif"`) and assert the returned
  spec is the Manrope entry.
- Look up a declaration with no surrounding quotes (e.g.
  `"Inter, sans-serif"`) and assert it resolves to the Inter entry.
- Look up a declaration with mixed-case family name (e.g.
  `"inter, sans-serif"` or `"INTER"`) and assert it resolves to the
  Inter entry.
- Look up a declaration whose primary family is not on the shortlist
  (e.g. `"'Comic Sans MS', sans-serif"`) and assert no result is
  returned.
