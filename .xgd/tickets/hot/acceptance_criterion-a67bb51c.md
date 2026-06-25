---
uid: acceptance_criterion-a67bb51c
id: AC-385
type: acceptance_criterion
title: CI workflow runs on pull requests against main, xgd-working, and xgd-stable
created_by: xgd
created_at: '2026-06-25T00:28:31.186980+00:00'
updated_at: '2026-06-25T00:28:31.186980+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The CI workflow is triggered by:

- `pull_request` events targeting any of the branches `main`,
  `xgd-working`, or `xgd-stable`
- Manual dispatch (`workflow_dispatch`)

When triggered, the workflow executes — in order — install of
dependencies with a frozen lockfile, a workspace-wide build, the test
suite, and a dry-run deploy of both Worker apps (public-site and
control-app). The workflow concludes successfully only if every step
succeeds.

## Verification

Parse the CI workflow definition and assert the `on.pull_request`
branch list, the presence of `workflow_dispatch`, and that the job's
step list contains — in the documented order — install, build, test,
public-site dry-run, and control-app dry-run.
