---
uid: acceptance_criterion-34d488ee
id: AC-481
type: acceptance_criterion
title: Preview viewport presets resize the iframe to mobile 375px, tablet 768px, desktop
  100%
created_by: xgd
created_at: '2026-06-25T01:59:36.685184+00:00'
updated_at: '2026-06-25T01:59:36.685184+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The preview panel exposes three viewport presets — mobile, tablet, desktop. Clicking each preset sets the preview iframe's width to 375px, 768px, and 100% of the preview pane respectively. Exactly one preset is marked active at any time (via an aria-pressed / active-class indicator on the toolbar buttons). The initial preset is desktop.

## Verification

Mount the preview panel. Assert the iframe starts at width `100%` and the desktop button is marked active. Click the mobile button; verify the iframe width becomes `375px` and the mobile button is marked active while the others are not. Click the tablet button; verify the iframe width becomes `768px` and tablet is the only active button. Click desktop; verify width returns to `100%` and the desktop button is the only active button.
