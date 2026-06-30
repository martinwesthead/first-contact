---
uid: acceptance_criterion-afa120cd
id: AC-828
type: acceptance_criterion
title: Resolving compareToDigestId yields a non-empty inspirationDelta with an explicit
  visual comparison term
created_by: xgd
created_at: '2026-06-30T06:24:32.323153+00:00'
updated_at: '2026-06-30T06:24:32.323153+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When `compareToDigestId` resolves to a previously cached reference digest, the response includes a non-empty `inspirationDelta` narrating concrete visual differences between the draft preview and the inspiration. The text contains at least one explicit visual comparison term (one of: aligned, centered, left, denser, sparser, lighter, heavier, warmer, cooler, tighter, looser).

## Verification
Seed a cached reference digest, invoke the tool with `compareToDigestId` pointing at it (both desktop screenshots available), and assert `inspirationDelta` is a non-empty string matching the comparison-term pattern.
