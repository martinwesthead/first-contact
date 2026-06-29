---
uid: acceptance_criterion-8d03dbaa
id: AC-756
type: acceptance_criterion
title: banner content contract requires heading; eyebrow, subhead, and cta are optional
created_by: xgd
created_at: '2026-06-29T23:37:34.994546+00:00'
updated_at: '2026-06-29T23:37:34.994546+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
The banner module's declared content contract marks `heading` as required (string) and marks `eyebrow` (string), `subhead` (markdown), and `cta` (object of `label` + `href`) as optional. The `subhead` field is declared as markdown so inline emphasis/links are supported, consistent with the hero subhead.

## Verification
Inspect the module's catalog content contract; assert `heading` is required and typed string, `subhead` is optional and typed markdown, and `eyebrow` and `cta` are optional.
