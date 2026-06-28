---
uid: acceptance_criterion-a0acd1dc
id: AC-631
type: acceptance_criterion
title: The builder AI's system prompt includes the reproduce-a-website how-to guidance
created_by: xgd
created_at: '2026-06-28T20:11:22.561784+00:00'
updated_at: '2026-06-28T20:11:22.561784+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
The system prompt sent to the builder AI on each chat turn includes the
reproduce-a-website how-to guidance, so the AI knows to read the transcription
digest and reconstruct the draft via its structured-edit and page-CRUD tools.
The included guidance references reading the transcription digest, applying theme
tokens, adding pages, the `/assets/{key}` asset-reference rule, the
`digest_not_found` fallback, and naming low-confidence sections.

## Verification
Drive a chat request and capture the system prompt sent to the model; assert it
contains the how-to guidance (e.g. references the digest read step and the
`/assets/` asset-reference rule). Assert the standalone how-to document exists and
covers its required sections.
