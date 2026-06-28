---
uid: acceptance_criterion-7c8d951f
id: AC-715
type: acceptance_criterion
title: duplicate_module inserts the clone after a named same-page target
created_by: xgd
created_at: '2026-06-28T23:54:04.471627+00:00'
updated_at: '2026-06-28T23:54:04.471627+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `duplicate_module` with `after_instance_id` referencing another module on the same page inserts the clone immediately after that named target instead of after the source.

## Verification
Duplicate a module with `after_instance_id` set to another module on the same page and assert the clone lands immediately after the named target.