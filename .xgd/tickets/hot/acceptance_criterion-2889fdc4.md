---
uid: acceptance_criterion-2889fdc4
id: AC-639
type: acceptance_criterion
title: Suggested module types are a deterministic ordered heuristic
created_by: xgd
created_at: '2026-06-28T20:29:46.179554+00:00'
updated_at: '2026-06-28T20:29:46.179554+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
Each per-page plan entry carries an ordered list of suggested module-type hints derived deterministically from the page's signals (no LLM): a header hint when the page has multiple nav links, a hero hint when a hero is detected, a content hint for sub-headings, a grouped/grid hint when list groups are present, a contact-form hint when form fields are present, and a footer hint always last. A page whose source has form fields includes the contact-form hint; the footer hint is always the final element.

## Verification
Produce the blueprint for a page whose source signals include form fields and nav links; assert its suggested-module-type list contains the contact-form hint and ends with the footer hint, and that the same input deterministically yields the same ordered list.
