---
uid: acceptance_criterion-44b0dfe5
id: AC-759
type: acceptance_criterion
title: banner renders a CTA button with the provided label and href when a cta is
  supplied
created_by: xgd
created_at: '2026-06-29T23:37:43.664231+00:00'
updated_at: '2026-06-29T23:37:43.664231+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
When a banner is given a `cta` value of `{ label, href }`, the rendered section contains a CTA button/link whose visible text is the supplied `label` and whose navigation target is the supplied `href`.

## Verification
Render a banner with a cta of a known label and href; assert the output contains a single CTA link element with that visible label and that href target.
