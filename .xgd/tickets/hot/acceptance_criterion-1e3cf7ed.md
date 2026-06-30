---
uid: acceptance_criterion-1e3cf7ed
id: AC-786
type: acceptance_criterion
title: Sidecar refuses a working directory outside the project root with HTTP 500
  and never spawns
created_by: xgd
created_at: '2026-06-30T01:11:10.394571+00:00'
updated_at: '2026-06-30T01:11:10.394571+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
When the sidecar's configured working directory is not within the allowed first-contact project root — judged by resolved path segments, so a sibling directory whose name merely shares the root's prefix is rejected — a POST to `/xgd-ticket` returns HTTP 500 with an error explaining the working-directory guard, and the CLI is never spawned.

## Verification
Configure the sidecar with a cwd outside the project root (including a prefix-sharing sibling) and an injected spawn function; POST a valid command; assert HTTP 500, the error explains the cwd guard, and the spawn function was never invoked.
