---
uid: acceptance_criterion-d3b52654
id: AC-596
type: acceptance_criterion
title: A deterministic what's-missing list is produced from absent signals without
  any AI pass
created_by: xgd
created_at: '2026-06-27T01:11:23.226678+00:00'
updated_at: '2026-06-27T01:11:23.226678+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given a set of extracted signals, a deterministic baseline produces a "what's missing" list containing one human-readable entry per absent major signal (e.g. background colour not declared, body font family not declared, no body+heading pair inferred, max content width not declared, no visual assets detected, no headings detected). This baseline is computed purely from the signals with no LLM involvement, so a useful "what's missing" list exists even when no AI commentary pass runs. A fully-populated signal set yields an empty list.

## Verification
Compute the baseline from a sparse signal set → assert the list contains a readable entry for each absent signal category. Compute it from a fully-populated signal set → assert the list is empty.
