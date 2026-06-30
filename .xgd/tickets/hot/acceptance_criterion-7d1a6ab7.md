---
uid: acceptance_criterion-7d1a6ab7
id: AC-785
type: acceptance_criterion
title: Sidecar rejects a command outside the allowlist with HTTP 400 and never spawns
created_by: xgd
created_at: '2026-06-30T01:11:06.479430+00:00'
updated_at: '2026-06-30T01:11:06.479430+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
A POST to the sidecar's `/xgd-ticket` endpoint with a `command` outside {create, list, get} returns HTTP 400 with a body whose error names the allowed set, and the CLI is never spawned.

## Verification
POST {command:"delete"} to the sidecar with an injected spawn function; assert HTTP 400, the error lists create/list/get, and the spawn function was never invoked.
