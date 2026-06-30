---
uid: acceptance_criterion-ededd7bd
id: AC-818
type: acceptance_criterion
title: Builder default network client succeeds in a real browser without an unbound-fetch
  TypeError (BUG-8)
created_by: xgd
created_at: '2026-06-30T04:43:45.512380+00:00'
updated_at: '2026-06-30T04:43:45.512380+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The builder's default network client — used by chat-session boot, message sends, and the session HTTP client when no fetch override is supplied — invokes the platform's global fetch with the global object as its receiver, so it works in a real browser whose fetch must be called with the window as `this`. Chat-session establishment and chat sends do not raise a "'fetch' called on an object that does not implement interface Window" TypeError under the default (no-override) configuration.

## Verification

Install a global fetch that throws a TypeError unless invoked with the global object as receiver (mimicking browser spec enforcement). Exercise each default-fetch path — booting the builder, sending a chat turn, and the session HTTP client — with no explicit fetch override. Confirm none raise the unbound-fetch TypeError and that no in-panel system message mentions "does not implement interface Window".
