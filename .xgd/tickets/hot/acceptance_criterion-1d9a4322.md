---
uid: acceptance_criterion-1d9a4322
id: AC-748
type: acceptance_criterion
title: content validation rejects missing required fields and malformed cta
created_by: xgd
created_at: '2026-06-29T23:13:23.344469+00:00'
updated_at: '2026-06-29T23:13:23.344469+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
Validating split-section content that omits any one of the required fields (`image`, `heading`, or `body`) reports failure, and the reported issues identify the missing field. Validating content whose `cta` is present but missing its required `href` also reports failure, with the reported issue identifying the `cta`'s `href`.

## Verification
For each required field, validate content missing exactly that field and assert validation fails with an issue naming that field. Validate content whose cta supplies a label but no href and assert validation fails with an issue identifying cta.href.
