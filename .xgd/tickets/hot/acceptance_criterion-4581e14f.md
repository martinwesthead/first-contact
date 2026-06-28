---
uid: acceptance_criterion-4581e14f
id: AC-666
type: acceptance_criterion
title: Transcribe progress card renders an info-toned 4-row stage list, all pending,
  titled by source URL
created_by: xgd
created_at: '2026-06-28T20:55:48.302119+00:00'
updated_at: '2026-06-28T23:31:49.876317+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When the terminal transcription-done result is rendered, the builder mounts an info-toned card titled "Converting {url}" (echoing the source URL) whose body is a **five-row** stage list in order — Clearing draft (Stage 0), Screenshot, Theme, Modules, Assets mirrored — with every row in a pending state initially.

## Verification
Create/render the progress card for a given URL. Assert the card tone is the info tone, the title reads "Converting <url>", exactly five stage rows exist in order labelled Clearing draft / Screenshot / Theme / Modules / Assets mirrored, and every row's status is "pending".
