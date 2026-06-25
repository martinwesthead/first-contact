---
uid: acceptance_criterion-c29d31fd
id: AC-426
type: acceptance_criterion
title: Text-block landing variant uses the default container width
created_by: xgd
created_at: '2026-06-25T01:11:20.025388+00:00'
updated_at: '2026-06-25T01:11:20.025388+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a text-block is rendered with the `landing` variant, its body content is laid out inside the framework's default container width tier.

## Verification

Render the text-block module with `variant: "landing"` and inspect the rendered markup: the body's container reflects the default container width tier from the theme tokens, distinguishable from the `prose` variant's narrow container.
