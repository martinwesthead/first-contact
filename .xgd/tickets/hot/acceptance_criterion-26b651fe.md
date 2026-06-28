---
uid: acceptance_criterion-26b651fe
id: AC-642
type: acceptance_criterion
title: Read-back returns the transcription digest for an existing site
created_by: xgd
created_at: '2026-06-28T20:30:10.230784+00:00'
updated_at: '2026-06-28T20:30:10.230784+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
A read-transcription-digest request for a site whose blueprint has been written returns success with the stored blueprint JSON — including its site identifier and source URL — for the AI to consume. The action is registered as a system action that the operator AI can invoke.

## Verification
After a blueprint is written for a site, invoke the read action with that site identifier; assert it returns a success result whose payload contains the digest with the matching site identifier and source URL.
