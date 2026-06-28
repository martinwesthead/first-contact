---
uid: acceptance_criterion-2c5bf96e
id: AC-687
type: acceptance_criterion
title: Inline content beginning with an angle bracket renders as trusted HTML unchanged
created_by: xgd
created_at: '2026-06-28T22:54:34.931545+00:00'
updated_at: '2026-06-28T22:54:34.931545+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
When a markdown content field holds an inline string whose first non-whitespace character is `<`, the renderer emits that string verbatim as trusted HTML with no markdown conversion. This preserves existing inline HTML body copy (e.g. `<p>...</p>`) with no migration.

## Verification
Render a module whose markdown field is an inline `<p>Hello</p>` string and assert the produced HTML contains that markup byte-for-byte (no escaping, no re-wrapping). The existing baseline site continues to render its body copy unchanged.