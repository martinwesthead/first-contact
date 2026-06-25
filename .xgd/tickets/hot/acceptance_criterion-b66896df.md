---
uid: acceptance_criterion-b66896df
id: AC-387
type: acceptance_criterion
title: Deploy workflow serializes concurrent runs per ref
created_by: xgd
created_at: '2026-06-25T00:28:40.528686+00:00'
updated_at: '2026-06-25T00:28:40.528686+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The deploy workflow declares a concurrency group keyed on the git
ref so that two deploys triggered on the same ref cannot run in
parallel. A new deploy on the same ref queues behind the running
one rather than racing against it.

## Verification

Parse the deploy workflow definition and assert that the
top-level `concurrency` block exists, that its `group` value
incorporates the git ref (so per-ref serialization is enforced),
and that the configuration prevents two simultaneous deploys of
the same ref from racing.
