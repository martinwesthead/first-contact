---
uid: acceptance_criterion-e77b6be6
id: AC-693
type: acceptance_criterion
title: Short single-paragraph captures are inlined rather than written to a file
created_by: xgd
created_at: '2026-06-28T22:54:50.940358+00:00'
updated_at: '2026-06-28T22:54:50.940358+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
A captured section whose verbatim markdown is short (below the inline threshold — a single paragraph with no block-level structure such as headings or lists) is surfaced in the digest as an inline markdown string rather than as a separate body-copy file.

## Verification
Run the convert/transcription flow against a source whose section copy is a short single paragraph (under the threshold). Assert the digest entry carries an inline markdown value for that section and that no separate body-copy file was written for it.