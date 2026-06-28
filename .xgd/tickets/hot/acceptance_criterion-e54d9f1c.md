---
uid: acceptance_criterion-e54d9f1c
id: AC-627
type: acceptance_criterion
title: Confirming an invalid URL fails validation and records no consent
created_by: xgd
created_at: '2026-06-28T20:10:46.830736+00:00'
updated_at: '2026-06-28T20:10:46.830736+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Recording consent requires a syntactically valid URL. A confirmation request
carrying a malformed/unparseable URL fails with a validation error identifying
the invalid URL and records no consent and no robots override.

## Verification
Invoke the confirmation action with a malformed URL string. Assert it returns a
failure whose message identifies the URL as invalid, and that no consent state or
robots override was created for it.
