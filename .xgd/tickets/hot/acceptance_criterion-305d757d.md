---
uid: acceptance_criterion-305d757d
id: AC-672
type: acceptance_criterion
title: Preview panel toolbar Reset button confirms, clears localStorage, and reloads
created_by: xgd
created_at: '2026-06-28T21:17:21.451724+00:00'
updated_at: '2026-06-28T21:17:21.451724+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The builder preview panel toolbar renders a **Reset** button (right-aligned, after the viewport-preset buttons). Clicking it shows a confirmation prompt; on confirm it removes the `1stcontact_builder_site_v1` working-site key from localStorage and triggers a page reload (so the builder cold-loads the bundled baseline starter site); on cancel neither the localStorage key is removed nor a reload is triggered.

## Verification

Boot the builder with injected `resetPrompt`, `reloadPage`, and `storageKey` test doubles. Assert the preview toolbar contains a Reset button (`[data-fc-preview-reset]`). Click it with `resetPrompt` returning `true` and assert `storage.removeItem('1stcontact_builder_site_v1')` was called and the `reloadPage` spy fired. Click it with `resetPrompt` returning `false` and assert neither `removeItem` nor `reloadPage` was called.
