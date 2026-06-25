---
uid: acceptance_criterion-532ca890
id: AC-482
type: acceptance_criterion
title: Preview iframe fills the full height of its panel rather than collapsing to
  the iframe default
created_by: xgd
created_at: '2026-06-25T01:59:48.642462+00:00'
updated_at: '2026-06-25T01:59:48.642462+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The preview iframe fills the full height of its parent panel — it does not collapse to a browser default (~150px) when the surrounding flex container has no explicit height. The preview root behaves as a column that flexes inside its parent and the iframe inside it stretches to consume the remaining height after the toolbar.

## Verification

Mount the preview panel inside a parent that has a definite height but no per-child height (e.g. a flex column whose only height comes from the layout). After mount, inspect the iframe's computed height and verify it is greater than the browser default (i.e. ≥ the panel height minus the toolbar), not the intrinsic 150px iframe default. Equivalently, assert that the iframe's effective height matches the container's available content height to within rendering tolerance.
