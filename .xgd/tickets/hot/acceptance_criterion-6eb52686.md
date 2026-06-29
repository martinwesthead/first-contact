---
uid: acceptance_criterion-6eb52686
id: AC-747
type: acceptance_criterion
title: content validation accepts valid split-section content
created_by: xgd
created_at: '2026-06-29T23:13:20.250266+00:00'
updated_at: '2026-06-29T23:13:20.250266+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
Validating split-section content that supplies the required `image`, `heading`, and `body` reports success (validation passes with no reported issues). Adding a well-formed optional `eyebrow` and a `cta` containing both `label` and `href` also passes validation.

## Verification
Validate a minimal content object (image + heading + body) against the split-section content schema and assert the result indicates success with an empty issue list. Validate a fuller object adding eyebrow and a complete cta and assert it also passes.
