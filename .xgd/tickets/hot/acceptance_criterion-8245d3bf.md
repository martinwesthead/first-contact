---
uid: acceptance_criterion-8245d3bf
id: AC-686
type: acceptance_criterion
title: A text asset reference with an empty source is rejected
created_by: xgd
created_at: '2026-06-28T22:54:32.262935+00:00'
updated_at: '2026-06-28T22:54:32.262935+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
A markdown content field set to a text-kind asset reference whose source key is empty fails whole-site validation. (The validator checks only that the source is a non-empty key; it does not check that the referenced file exists.)

## Verification
Validate a site definition whose markdown field is a text asset reference with an empty source string. Assert validation fails and the failure identifies the offending field/value.