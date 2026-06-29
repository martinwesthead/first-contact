---
uid: acceptance_criterion-8d77f981
id: AC-763
type: acceptance_criterion
title: logo-strip content validation rejects missing/empty items and items without
  an image
created_by: xgd
created_at: '2026-06-29T23:44:58.482996+00:00'
updated_at: '2026-06-29T23:44:58.482996+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
Content validation for `logo-strip` enforces the items contract:
- Content with no `items` field is rejected, with the failure attributed to `items`.
- Content with an empty `items` list (below the minimum of 1) is rejected, attributed to `items`.
- Content where any item is missing its required `image` is rejected.
- Minimal valid content — a single item carrying only an `image` — is accepted with no issues.
- Content with up to 12 items, each with an `image` plus well-formed optional `heading`, `label`, and `href`, is accepted.

## Verification
Run the content validator against each case and assert: the three invalid cases report `ok = false` with at least one issue whose path identifies `items` (or the missing-image item); the minimal and fully-populated valid cases report `ok = true` with no issues.
