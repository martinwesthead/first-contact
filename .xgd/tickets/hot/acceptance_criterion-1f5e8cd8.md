---
uid: acceptance_criterion-1f5e8cd8
id: AC-636
type: acceptance_criterion
title: Undetected palette and typography fall back to framework defaults
created_by: xgd
created_at: '2026-06-28T20:29:19.844214+00:00'
updated_at: '2026-06-28T20:29:19.844214+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
When the source digest reports no palette and no typography (all signals not-detected), the transcription blueprint's theme tokens equal the framework's default theme tokens unchanged — no source-derived overrides are introduced. The blueprint is still produced (the convert flow does not refuse), so reconstruction can proceed from the remaining page/content signals.

## Verification
Derive theme tokens from a digest whose palette and typography are entirely not-detected; assert the resulting palette and typography-family tokens deep-equal the framework default theme tokens, and that a blueprint is still produced.
