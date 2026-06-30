---
uid: acceptance_criterion-1ceb1ff3
id: AC-781
type: acceptance_criterion
title: xgd_ticket action fails closed when dev-tools disabled, without contacting
  the sidecar
created_by: xgd
created_at: '2026-06-30T01:10:25.276798+00:00'
updated_at: '2026-06-30T01:10:25.276798+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
Invoking the `xgd_ticket` action while the dev-tools flag is not "true" returns a failed result and performs no outbound request to the sidecar — even if the tool is forced (defence in depth).

## Verification
Invoke the action with the dev-tools flag disabled and an injected request function; assert the result status is "failed" and the injected request function was never called.
