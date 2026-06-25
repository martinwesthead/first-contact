---
uid: acceptance_criterion-2d779057
id: AC-428
type: acceptance_criterion
title: Text-block omits the heading element when no heading is provided in content
created_by: xgd
created_at: '2026-06-25T01:11:26.054281+00:00'
updated_at: '2026-06-25T01:11:26.054281+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a text-block is rendered with content that omits the optional `heading` field, the rendered output contains no heading element above the body.

## Verification

Render a text-block with only a body and no heading; assert that the text-block's rendered markup does not contain a heading element in the heading slot above the body.
