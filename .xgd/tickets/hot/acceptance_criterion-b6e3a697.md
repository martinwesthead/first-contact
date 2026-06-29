---
uid: acceptance_criterion-b6e3a697
id: AC-758
type: acceptance_criterion
title: banner renders an optional eyebrow label and markdown subhead when provided
created_by: xgd
created_at: '2026-06-29T23:37:40.794453+00:00'
updated_at: '2026-06-29T23:37:40.794453+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
When a banner is given an `eyebrow` and a `subhead`, the rendered section shows the eyebrow text as a label above the heading and renders the subhead content, with the subhead treated as markdown so inline formatting (emphasis/links) is carried through rather than being stripped.

## Verification
Render a banner supplying eyebrow and a subhead containing inline markdown; assert the eyebrow label text appears above the heading and the subhead content (including its inline formatting) is present in the output.
