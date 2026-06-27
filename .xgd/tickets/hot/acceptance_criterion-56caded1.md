---
uid: acceptance_criterion-56caded1
id: AC-605
type: acceptance_criterion
title: A successful analysis through chat surfaces a kind-tagged reference_digest
  tool_result
created_by: xgd
created_at: '2026-06-27T01:26:10.360480+00:00'
updated_at: '2026-06-27T01:26:10.360480+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
After a successful analysis performed through the chat flow, the chat responses tool-calls list includes an entry for the analyze action whose result is a success carrying `kind: "reference_digest"` and the full digest data, so the front-end can route it to the digest renderer.

## Verification
Drive a chat turn whose assistant response calls the analyze action with intent established. Assert the chat response bodys `toolCalls` contains an entry with a successful result whose `applied.kind === "reference_digest"` and `applied.data.digest` present.
