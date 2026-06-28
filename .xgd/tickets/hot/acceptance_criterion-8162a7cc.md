---
uid: acceptance_criterion-8162a7cc
id: AC-425
type: acceptance_criterion
title: Text-block prose variant constrains body width to the narrow container
created_by: xgd
created_at: '2026-06-25T01:11:17.594443+00:00'
updated_at: '2026-06-28T21:09:07.149819+00:00'
completed_at: null
last_field_updated: uat_coverage
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

When a text-block is rendered with the `prose` variant, its body content is laid out inside the framework's narrow container width — not the default container.

## Verification

Render the text-block module with `variant: "prose"` and inspect the rendered markup: the body's container reflects the narrow container width tier from the theme tokens (e.g., the rendered output references `--container-narrow` or carries a marker tying it to that tier), distinct from what the `landing` variant produces.