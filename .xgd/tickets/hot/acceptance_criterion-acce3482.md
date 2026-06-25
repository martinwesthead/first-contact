---
uid: acceptance_criterion-acce3482
id: AC-487
type: acceptance_criterion
title: POST /api/chat returns 500 when API key is missing and 502 when the upstream
  call fails
created_by: xgd
created_at: '2026-06-25T02:00:51.400124+00:00'
updated_at: '2026-06-25T02:00:51.400124+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

`POST /api/chat` returns HTTP 500 with a JSON body whose `error` field mentions `CLAUDE_API_KEY` when the worker environment has no `CLAUDE_API_KEY` secret bound. It returns HTTP 502 when the upstream Anthropic call either throws (network/transport failure) or completes with a non-2xx status — the response in either case is a JSON object whose `error` field describes the upstream failure.

## Verification

Issue a POST to `/api/chat` with a well-formed JSON body but no `CLAUDE_API_KEY` in the environment; verify the response status is 500 and the JSON body's `error` field mentions `CLAUDE_API_KEY`. Issue another POST with the key bound but the upstream fetch stubbed to throw; verify the response status is 502. Issue a third POST with the upstream stubbed to return a non-2xx response (e.g. 503); verify the response status is also 502.
