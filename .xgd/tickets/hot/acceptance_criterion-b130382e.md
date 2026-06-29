---
uid: acceptance_criterion-b130382e
id: AC-760
type: acceptance_criterion
title: CTA presence is driven by cta content, not by the chosen variant
created_by: xgd
created_at: '2026-06-29T23:37:46.436317+00:00'
updated_at: '2026-06-29T23:37:46.436317+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-69fa1c75
  kind: behavior
  regression_only: false
---

## Criterion
The banner variants are visual-only: whether the CTA renders depends solely on whether a `cta` content value is present, independent of the selected variant. Selecting the `with-cta` variant without supplying a `cta` value renders no CTA element; supplying a `cta` value renders the CTA regardless of variant.

## Verification
Render the `with-cta` variant with no cta and assert no CTA element appears; render with a cta present and assert the CTA element appears. Confirm the gating tracks the cta content value rather than the variant name.
