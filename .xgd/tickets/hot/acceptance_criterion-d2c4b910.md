---
uid: acceptance_criterion-d2c4b910
id: AC-589
type: acceptance_criterion
title: Layout signals report content width, alignment bias, and density
created_by: xgd
created_at: '2026-06-27T01:10:24.527760+00:00'
updated_at: '2026-06-27T01:10:24.527760+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document, the digest's layout signal reports three values: `maxContentWidth` as an integer pixel value taken from the smallest declared `max-width` on a content-bearing selector within a 400–2000px sanity band (else `not_detected`); `bias` as `centered` when a content selector declares centering (e.g. `margin: ... auto`), `left` when explicit left alignment is declared, else `not_detected`; and `density` as one of `sparse | balanced | dense` derived from the count of content-bearing elements near the top of `<body>` (or `not_detected` when the body is empty).

## Verification
Run layout extraction against: (a) a page with a centered container declaring `max-width: 1200px` and a content-rich body → assert `maxContentWidth` is 1200, `bias` is `centered`, and `density` is a valid band; (b) a near-empty page with no layout CSS → assert `maxContentWidth` and `bias` are `not_detected`.
