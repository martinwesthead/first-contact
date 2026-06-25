---
uid: acceptance_criterion-2935a34a
id: AC-393
type: acceptance_criterion
title: Module instance missing required field is rejected with JSON-pointer path
created_by: xgd
created_at: '2026-06-25T00:38:40.170141+00:00'
updated_at: '2026-06-25T00:38:40.170141+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

When a `ModuleInstance` inside a page is missing a required field
(e.g. omits `type` or `version`), `validateSite()` returns the
failure branch `{ ok: false, errors }`. The errors include an
entry whose `path` is a JSON pointer locating the offending field
inside the input (for example
`/pages/0/modules/0/type`) and whose `message` is human-readable.

## Verification

Mutate a known-good site fixture to remove a required
`ModuleInstance` field, call `validateSite()`, and assert:
- the failure branch is returned;
- one of `errors[].path` points to the omitted field using
  JSON-pointer syntax.
