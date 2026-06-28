---
uid: acceptance_criterion-4dd68bcb
id: AC-614
type: acceptance_criterion
title: Screenshots upload to the references keyspace under an 8 MB per-viewport cap
created_by: xgd
created_at: '2026-06-28T19:41:55.812532+00:00'
updated_at: '2026-06-28T19:41:55.812532+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given mobile/tablet/desktop PNG screenshot bytes, the upload step writes each viewport to the shared assets bucket at `references/{chatId}/{turnId}/{viewport}.png` and returns the produced keys. Any viewport whose PNG exceeds the 8 MB per-viewport cap is dropped (reported as `screenshot_too_large`) rather than uploaded, and any viewport the driver did not produce is skipped.

## Verification
Upload three in-cap screenshots → assert three keys at `references/{chatId}/{turnId}/{mobile,tablet,desktop}.png`; upload a set including one viewport over the 8 MB cap → assert that viewport is dropped (reported `screenshot_too_large`) and the remaining viewports upload with keys returned.
