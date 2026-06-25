---
uid: acceptance_criterion-a9ea366c
id: AC-479
type: acceptance_criterion
title: Collapsed restore rail sits on the left edge of the preview, not the right
created_by: xgd
created_at: '2026-06-25T01:59:16.752387+00:00'
updated_at: '2026-06-25T01:59:16.752387+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the chat panel is collapsed, the restore rail sits immediately to the left of the preview panel — not on the right of the preview, and not detached from it. The DOM order is: (hidden) chat panel → (hidden) splitter → restore rail → preview panel, so the restored chevron remains at the same screen edge the chat used to occupy.

## Verification

Mount the builder layout into a DOM and trigger the collapse control. Inspect the rendered children of the layout root and verify the restore rail appears immediately before the preview panel in document order, and after the (hidden) chat panel and (hidden) splitter. Confirm the restore rail is visible while the chat panel and splitter are hidden.
