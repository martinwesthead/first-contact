---
uid: acceptance_criterion-4844137b
id: AC-838
type: acceptance_criterion
title: preview_generated_page is exposed to the builder AI as a trial-tier tool with
  pageId and compareToDigestId inputs and a self-inspection description
created_by: xgd
created_at: '2026-06-30T06:25:36.484074+00:00'
updated_at: '2026-06-30T06:25:36.484074+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
`preview_generated_page` is registered as an operator tool available to the builder AI at the trial tier, with a handler. Its advertised tool specification exposes optional `pageId` and `compareToDigestId` inputs, and its description conveys the self-inspection use case (checking the AI's own work, verifying a change landed, or answering "what does this page look like right now").

## Verification
Look up the registered action by name and assert it resolves to a system action with a handler; assert the tool spec visible at the trial tier includes `pageId` and `compareToDigestId` in its input schema; assert the description text references inspecting the AI's own work / "what this page looks like".
