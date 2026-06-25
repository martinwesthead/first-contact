---
uid: acceptance_criterion-a5853f5e
id: AC-480
type: acceptance_criterion
title: Splitter drag resizes the chat panel, clamps to min and max, and persists the
  final width
created_by: xgd
created_at: '2026-06-25T01:59:27.097066+00:00'
updated_at: '2026-06-25T01:59:27.097066+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The operator can drag the splitter between the chat and preview panels to resize them. The chat panel width tracks the drag delta in real time; it is clamped to configured minimum and maximum widths so the splitter cannot push the chat narrower than its minimum or wider than its maximum. When the drag ends, the final width is persisted to the operator's browser storage and applied on subsequent mounts.

## Verification

Mount the builder layout with known min/max widths. Begin a drag at the splitter (capture the pointer), move the pointer by deltas that would put the chat both inside and outside the clamp range, and release. Verify the chat panel width tracks each in-range delta, the panel width clamps to the configured minimum and maximum at the extremes, and after pointer release the saved state records the final clamped width. Mount a second layout against the same storage; verify it starts at the persisted final width.
