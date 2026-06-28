---
uid: acceptance_criterion-1be7942b
id: AC-716
type: acceptance_criterion
title: duplicate_module rejects a cross-page after_instance_id
created_by: xgd
created_at: '2026-06-28T23:54:07.145499+00:00'
updated_at: '2026-06-28T23:54:07.145499+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
`duplicate_module` rejects an `after_instance_id` that refers to a module on a different page than the source, and rejects an unknown source `instance_id`; rejected calls leave the site unchanged.

## Verification
Apply `duplicate_module` with `after_instance_id` pointing at a module on another page (assert rejection naming the cross-page mismatch) and with an unknown source id (assert rejection).