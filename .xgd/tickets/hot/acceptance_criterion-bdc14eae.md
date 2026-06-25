---
uid: acceptance_criterion-bdc14eae
id: AC-478
type: acceptance_criterion
title: Chat panel collapses to a 32px restore rail and restores to remembered width
  across reload
created_by: xgd
created_at: '2026-06-25T01:59:07.478741+00:00'
updated_at: '2026-06-25T01:59:07.478741+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When the builder is mounted and the operator clicks the chat-panel collapse control, the chat panel hides, the splitter hides, and a narrow restore rail (32px wide by configuration) appears in their place. Clicking the restore rail re-expands the chat panel to the same width it had before collapsing. The collapsed/expanded flag and the chat-panel width are persisted to the operator's browser storage, so a freshly-mounted builder against the same storage starts in the same state.

## Verification

Mount the builder layout into a DOM with a known initial chat width (e.g. 420px). Observe that the chat panel is visible and the restore rail hidden. Trigger the collapse control; verify the chat panel and splitter are hidden, the restore rail is shown with its configured collapsed width, and the saved state records `collapsed=true, chatWidthPx=420`. Discard the layout and mount a fresh layout against the same storage; verify the new instance starts collapsed at the persisted width and that the restore rail is visible. Trigger the restore control; verify the chat panel returns to 420px and the saved state records `collapsed=false, chatWidthPx=420`.
