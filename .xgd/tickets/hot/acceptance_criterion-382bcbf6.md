---
uid: acceptance_criterion-382bcbf6
id: AC-751
type: acceptance_criterion
title: single variant renders only the first item regardless of how many are supplied
created_by: xgd
created_at: '2026-06-29T23:21:07.577564+00:00'
updated_at: '2026-06-29T23:21:07.577564+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-28887b36
  kind: behavior
  regression_only: false
---

## Criterion
When rendered with the `single` variant, the module renders only the first supplied testimonial item and suppresses every subsequent item, no matter how many items are provided. The rendered section is identifiable as the single variant (it carries `data-variant="single"`) and produces exactly one testimonial card; the first item's quote and attribution name appear in the output while the names of later items do not.

## Verification
Render the module with the `single` variant and three items; assert the section is marked `data-variant="single"`, that exactly one testimonial card is emitted, that the first item's quote text and name appear, and that the second and third items' names are absent.
