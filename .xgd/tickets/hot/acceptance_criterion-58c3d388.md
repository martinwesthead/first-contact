---
uid: acceptance_criterion-58c3d388
id: AC-834
type: acceptance_criterion
title: An /assets reference with no backing object preserves its original src and
  does not break the preview
created_by: xgd
created_at: '2026-06-30T06:25:09.259641+00:00'
updated_at: '2026-06-30T06:25:09.259641+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When an `/assets/<key>` reference in the draft points at an object that does not exist in storage, the original `/assets/<key>` reference is preserved (not dropped or blanked) and the preview still renders without error. In a draft mixing resolvable and missing references, resolvable ones are inlined while each missing one keeps its original reference (per-asset graceful degradation).

## Verification
Render a draft containing one resolvable and one missing `/assets/<key>` reference; assert the resolvable one is inlined as a data URL, the missing one retains its original `/assets/<key>` value, and the call completes successfully (no crash).
