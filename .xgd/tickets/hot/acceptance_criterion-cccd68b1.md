---
uid: acceptance_criterion-cccd68b1
id: AC-783
type: acceptance_criterion
title: xgd_ticket action routes an allowed command to the sidecar and surfaces stdout/stderr/exit
  code
created_by: xgd
created_at: '2026-06-30T01:10:46.617009+00:00'
updated_at: '2026-06-30T01:10:46.617009+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
With dev-tools enabled, invoking the `xgd_ticket` action with an allowed command and optional string args sends a POST to the sidecar URL carrying a JSON body `{command, args?}`, and on a successful sidecar response returns an ok result that carries the command's stdout, stderr, and exit code, tagged so the AI's subsequent turn receives that output.

## Verification
Invoke with {command:"create", args:[...]} and an injected request function; assert a POST was issued to the sidecar URL with body {command, args}, and the returned result has status "ok" and exposes the sidecar's stdout/stderr/exitCode to the AI's next turn.
