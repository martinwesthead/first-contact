---
uid: acceptance_criterion-4177019c
id: AC-446
type: acceptance_criterion
title: Each module instance is wrapped in an anchor element carrying its instance
  id and a data-module-instance marker
created_by: xgd
created_at: '2026-06-25T01:23:58.624804+00:00'
updated_at: '2026-06-25T01:23:58.624804+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

Within each rendered page's `<body>`, every module instance from the page definition is enclosed in an outer element whose `id` equals the module instance's id and whose `data-module-instance` attribute also equals the module instance's id. In-page anchor links (e.g. `href="#contact"`) therefore resolve to the corresponding module.

## Verification

Render a fixture page containing multiple module instances with distinct ids. Parse the emitted HTML and assert that for every module instance in the source definition there is exactly one element in the output whose `id` and `data-module-instance` attribute both equal that instance's id.
