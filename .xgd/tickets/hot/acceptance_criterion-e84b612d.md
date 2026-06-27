---
uid: acceptance_criterion-e84b612d
id: AC-601
type: acceptance_criterion
title: Every fetch-safety failure is returned as a typed error, never as an uncaught
  exception
created_by: xgd
created_at: '2026-06-27T01:25:59.699418+00:00'
updated_at: '2026-06-27T01:25:59.699418+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
Each failure mode of the external-fetch safety contract — SSRF/scheme rejection, redirect-cap or body-size-cap abort, rate-limit exhaustion, and robots.txt disallow — is surfaced on the actions failure branch as a typed error result with a descriptive message. No safety failure escapes the action as an uncaught exception.

## Verification
Drive the action into each safety failure (e.g. blocklisted host, robots-disallowed origin, exhausted rate-limit window) and assert each returns a failure result whose message identifies the safety reason, and that no call throws.
