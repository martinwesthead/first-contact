---
uid: acceptance_criterion-8bcc20fe
id: AC-462
type: acceptance_criterion
title: CI workflow runs the public-site generate step before tests and before the
  public-site dry-run deploy
created_by: xgd
created_at: '2026-06-25T01:36:01.375233+00:00'
updated_at: '2026-06-25T01:36:01.375233+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

The CI workflow definition contains a step that produces the public-site static bundle from the 1stcontact site definition, and that step is ordered earlier than both the test-run step and the public-site dry-run deploy step in the same job.

## Verification

Parsing the CI workflow definition (`.github/workflows/ci.yml`) and locating the step that runs the public-site generate command, the step that runs the test suite, and the step that runs the public-site dry-run deploy: the generate step's position in the job's step sequence is earlier than each of the other two.
