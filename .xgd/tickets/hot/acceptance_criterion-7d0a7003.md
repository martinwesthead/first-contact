---
uid: acceptance_criterion-7d0a7003
id: AC-688
type: acceptance_criterion
title: Inline markdown is converted to HTML before emission
created_by: xgd
created_at: '2026-06-28T22:54:37.662966+00:00'
updated_at: '2026-06-28T22:54:37.662966+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
When a markdown content field holds an inline string that does NOT begin with `<`, the renderer converts the markdown to HTML before emitting it.

## Verification
Render a module whose markdown field is `# Heading` (or a list/emphasis sample) and assert the output is the converted HTML (e.g. a heading element / list markup), not the literal markdown source.