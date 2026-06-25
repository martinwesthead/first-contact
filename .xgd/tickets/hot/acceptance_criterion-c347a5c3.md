---
uid: acceptance_criterion-c347a5c3
id: AC-463
type: acceptance_criterion
title: Deploy workflow runs the public-site generate step before the public-site wrangler
  deploy
created_by: xgd
created_at: '2026-06-25T01:36:11.336992+00:00'
updated_at: '2026-06-25T01:36:11.336992+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

The deploy workflow definition contains a step that produces the public-site static bundle from the 1stcontact site definition, and that step is ordered earlier than the step that runs `wrangler deploy` for the public-site Worker in the same job.

## Verification

Parsing the deploy workflow definition (`.github/workflows/deploy.yml`) and locating the step that runs the public-site generate command and the step that runs the public-site `wrangler deploy`: the generate step's position in the job's step sequence is earlier than the deploy step.
