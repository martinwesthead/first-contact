---
uid: acceptance_criterion-055adbf3
id: AC-421
type: acceptance_criterion
title: Footer renders the copyright with the supplied year and holder without computing
  the year at render time
created_by: xgd
created_at: '2026-06-25T00:57:20.472176+00:00'
updated_at: '2026-06-25T00:57:20.472176+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-1d5b450f
  kind: behavior
  regression_only: false
---

## Criterion

Rendering the footer module with a `copyrightHolder` and a `copyrightYear` produces markup that contains a copyright line including both values verbatim. The rendered year reflects the supplied value, not the current date, so successive renders with the same inputs produce byte-identical output regardless of when they run.

## Verification

Render the footer module with a known `copyrightHolder` and a known `copyrightYear` that is deliberately not the current year (e.g. 1999). Assert the rendered HTML contains a copyright line displaying both the supplied year and the supplied holder. Render the module a second time with the same inputs and assert the relevant copyright fragment is byte-identical between renders.
