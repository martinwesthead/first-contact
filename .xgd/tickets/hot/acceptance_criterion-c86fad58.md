---
uid: acceptance_criterion-c86fad58
id: AC-768
type: acceptance_criterion
title: Convert-flow LLM context documents logo-strip module selection
created_by: xgd
created_at: '2026-06-29T23:45:13.058375+00:00'
updated_at: '2026-06-29T23:45:13.058375+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
The convert-flow LLM context (the authoring assistant's module-selection guidance) includes a `logo-strip` entry describing it as a horizontal row of small same-size logos/icons with optional labels and links, naming both the `logos` and `features` variants and the `columns` dial, and guiding the assistant to choose it for rows of small logos/icons (not for individual hero or service images).

## Verification
Inspect the convert-flow LLM context guidance and assert it contains a `logo-strip` selection entry that names the `logos` and `features` variants and the `columns` dial, and includes the guidance to use it for a row of small same-size logos/icons.
