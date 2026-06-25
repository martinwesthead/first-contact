---
uid: acceptance_criterion-f6626c06
id: AC-386
type: acceptance_criterion
title: Deploy workflow triggers on push to xgd-stable and deploys both Workers to
  production
created_by: xgd
created_at: '2026-06-25T00:28:36.493858+00:00'
updated_at: '2026-06-25T00:28:36.493858+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The deploy workflow is triggered by:

- A `push` event whose branch is `xgd-stable`
- Manual dispatch (`workflow_dispatch`)

When triggered, the workflow runs — in order — install with a frozen
lockfile, a workspace-wide build, then `wrangler deploy --env
production` for the public-site Worker followed by `wrangler deploy
--env production` for the control-app Worker. Both deploy invocations
must run inside the job so a single workflow run ships both Workers.

## Verification

Parse the deploy workflow definition and assert: the `on.push`
branch list contains `xgd-stable`, `workflow_dispatch` is present,
and the job's steps include — in order — install, build, a wrangler
deploy step targeting the public-site Worker package with
`--env production`, and a wrangler deploy step targeting the
control-app Worker package with `--env production`.
