---
uid: acceptance_criterion-88f42525
id: AC-700
type: acceptance_criterion
title: Stage 0 'cleared' notification fires before any digest write and the cleared
  definition is returned for the FE
created_by: xgd
created_at: '2026-06-28T23:09:54.689807+00:00'
updated_at: '2026-06-28T23:09:54.689807+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
A successful convert emits a stage 0 `cleared` progress notification (carrying the
seeded business name) before any digest is written or any later-stage progress event,
and includes the cleared scaffold definition in the completion result. The builder
applies that returned definition to its working draft so subsequent AI structured
edits land on the freshly-cleared scaffold rather than the previous draft.

## Verification
Convert an analyzed, consent-free URL and capture the ordered progress events. Assert
a stage 0 event with status `cleared` (carrying the business name) is emitted before
the digest-written event. Assert the completion result carries the cleared scaffold
definition, and that subsequent structured edits in the flow operate on that cleared
draft.
