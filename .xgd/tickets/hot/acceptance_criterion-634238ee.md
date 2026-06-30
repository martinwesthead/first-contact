---
uid: acceptance_criterion-634238ee
id: AC-787
type: acceptance_criterion
title: Sidecar runs an allowed command in the project directory and returns structured
  output
created_by: xgd
created_at: '2026-06-30T01:11:14.712758+00:00'
updated_at: '2026-06-30T01:11:14.712758+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
A POST to the sidecar's `/xgd-ticket` endpoint with an allowed command and string args spawns `xgd ticket <command> <args>` in the configured project directory and returns a JSON body of the shape `{ok: true, stdout, stderr, exitCode}`.

## Verification
POST {command:"list", args:[...]} with an injected spawn function bound to the project cwd; assert the spawn received argv ["ticket","list",...] with cwd set to the project root, and the response body is {ok:true, stdout, stderr, exitCode}.
