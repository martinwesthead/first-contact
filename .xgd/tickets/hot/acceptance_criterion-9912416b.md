---
uid: acceptance_criterion-9912416b
id: AC-836
type: acceptance_criterion
title: Preview card shows a 'vs. inspiration' section only when an inspirationDelta
  is present
created_by: xgd
created_at: '2026-06-30T06:25:28.357850+00:00'
updated_at: '2026-06-30T06:25:28.357850+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When the preview payload includes an `inspirationDelta`, the chat card renders a "vs. inspiration" section, positioned below the screenshot strip, containing the delta text. When no `inspirationDelta` is present, no "vs. inspiration" section is rendered.

## Verification
Render the card from a payload with a non-empty `inspirationDelta` and assert a "vs. inspiration" section appears below the screenshot strip containing the delta text; render the card from a payload with no `inspirationDelta` and assert no such section is present.
