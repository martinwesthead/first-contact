---
uid: acceptance_criterion-6879202c
id: AC-670
type: acceptance_criterion
title: Terminal transcribe-done result renders the progress card with narrative and
  summarized failed mirrors
created_by: xgd
created_at: '2026-06-28T20:55:59.333043+00:00'
updated_at: '2026-06-28T20:55:59.333043+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When the convert flow's terminal "transcription done" tool result is rendered (carrying a narrative and an asset-mirror summary), the builder mounts the info-toned progress card showing the narrative text and, for each failure in the summary, a "What couldn't mirror" row naming the URL and reason.

## Verification
Render a terminal transcription-done tool result containing a narrative and a summary with one failure. Assert the card tone is the info tone, the narrative text is displayed, and a failed-mirror row exists for the summarized failure URL.
