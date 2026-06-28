---
uid: acceptance_criterion-cfc33c19
id: AC-612
type: acceptance_criterion
title: The rendered fetch path returns hydrated HTML and computed styles via the injected
  driver
created_by: xgd
created_at: '2026-06-28T19:41:49.981324+00:00'
updated_at: '2026-06-28T19:41:49.981324+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Running the rendered fetch path against a JS-SPA reference (through the injectable browser driver) returns the hydrated HTML — well over 1000 visible characters where the static shell had almost none — together with computed styles for body and headings (computed font family/size/weight for body/h1/h2/h3 and the body/above-the-fold background colours), the computed `background-image` assets discovered in the page, and per-viewport PNG screenshot bytes. In tests the driver is injected and deterministic, so no real browser is launched.

## Verification
Run the rendered fetch with a fake driver returning the js-spa fixture → assert the returned HTML has over 1000 visible characters and that computed styles for body and h1 are present.
