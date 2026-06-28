---
uid: acceptance_criterion-b23a9b41
id: AC-621
type: acceptance_criterion
title: The Digest Report card renders a mobile/tablet/desktop screenshot strip as
  the first body element when screenshot keys are present
created_by: xgd
created_at: '2026-06-28T19:58:14.747275+00:00'
updated_at: '2026-06-28T19:58:14.747275+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
Given a successful `reference_digest` tool_result whose digest carries `screenshotKeys`, the Digest Report card renders a screenshot strip as the first element of the card body (before the digest markdown and the asset inventory), with one figure per present viewport (mobile, tablet, desktop) whose image `src` resolves the stored key via `/assets/{key}`. When no `screenshotKeys` are present, no strip is rendered and the markdown body remains first.

## Verification
Pass a `reference_digest` tool_result with populated `screenshotKeys` to the card renderer. Assert a screenshot-strip element exists, is the first child of the card body (preceding the rendered markdown), contains an `<img>` per present viewport with `src` equal to `/assets/{key}`. Pass a second tool_result with no `screenshotKeys` and assert no strip element is rendered.
