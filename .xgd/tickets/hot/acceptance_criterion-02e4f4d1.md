---
uid: acceptance_criterion-02e4f4d1
id: AC-827
type: acceptance_criterion
title: Unknown pageId returns a descriptive failure naming the known page ids
created_by: xgd
created_at: '2026-06-30T06:24:28.248590+00:00'
updated_at: '2026-06-30T06:24:28.248590+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When a `pageId` that matches no draft page is supplied, the tool returns a failure result whose error message names the unknown id and lists the draft's known page ids — it does not silently fall back to another page or crash.

## Verification
Invoke the tool with a `pageId` not present in the draft; assert the result status is a failure and the error text contains both the offending id and the set of valid page ids.
