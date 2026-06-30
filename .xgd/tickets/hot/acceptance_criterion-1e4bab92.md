---
uid: acceptance_criterion-1e4bab92
id: AC-782
type: acceptance_criterion
title: xgd_ticket action rejects commands outside the allowlist without contacting
  the sidecar
created_by: xgd
created_at: '2026-06-30T01:10:42.789594+00:00'
updated_at: '2026-06-30T01:10:42.789594+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d44dfd7c
  kind: behavior
  regression_only: false
---

## Criterion
With dev-tools enabled, invoking the `xgd_ticket` action with a `command` other than create/list/get returns a failed result whose error message names the allowed set, and performs no outbound request to the sidecar.

## Verification
Invoke the action with command "delete" and an injected request function; assert result status "failed", the error text lists create/list/get, and the request function was never called.
