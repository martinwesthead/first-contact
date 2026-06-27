---
uid: acceptance_criterion-7287ff52
id: AC-545
type: acceptance_criterion
title: Authorized system action dispatches server-side and returns structured payload
created_by: xgd
created_at: '2026-06-27T00:08:51.032549+00:00'
updated_at: '2026-06-27T00:08:51.032549+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a07c8ed3
  kind: behavior
  regression_only: false
---

## Criterion
A POST to `/api/operator/<system_action_name>` from a request whose plan tier meets or exceeds the action's required tier executes the server-side handler and returns HTTP 200 with a JSON body of shape `{ status: "ok", action: "<name>", payload: { ... } }`. The payload includes at minimum an `action` field naming the executed action and a `status` field describing the outcome (e.g. `"published"`).

## Verification
A UAT sends `POST /api/operator/publish_stub` with headers `x-plan-tier: paid`, `x-account-id: acct-test`, `x-session-id: sess-1`, and JSON body `{"note":"hello"}`. The response is 200 with `status: "ok"`, `action: "publish_stub"`, and `payload.status: "published"`. The payload also contains a `note` field equal to `"hello"` and a non-empty `site_url` string.
