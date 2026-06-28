---
uid: acceptance_criterion-d5147ff5
id: AC-689
type: acceptance_criterion
title: A text-asset-ref markdown field is resolved and its markdown converted to HTML
created_by: xgd
created_at: '2026-06-28T22:54:40.370785+00:00'
updated_at: '2026-06-28T22:54:40.370785+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
When a markdown content field holds a text-kind asset reference and a resolver is available, the renderer obtains the referenced markdown through the resolver and converts it to HTML in the output.

## Verification
Render a module whose markdown field is a text asset reference, with a resolver that returns a known markdown string. Assert the rendered HTML reflects that resolved markdown converted to HTML.