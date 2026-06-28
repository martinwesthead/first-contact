---
uid: acceptance_criterion-e7a340f8
id: AC-714
type: acceptance_criterion
title: duplicate_module deep-clones an instance after the source by default
created_by: xgd
created_at: '2026-06-28T23:54:01.774596+00:00'
updated_at: '2026-06-28T23:54:01.774596+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
Calling `duplicate_module` with only `instance_id` deep-clones that module on the same page — the clone has a fresh id unique within the site and identical type, version, variant, dials, and content (asset references duplicated by reference) — and is inserted immediately after the source instance.

## Verification
Duplicate an existing module, then assert a new module exists with a different id but identical type/version/variant/dials/content, positioned directly after the source in that page's module order.