---
uid: acceptance_criterion-c0f9805d
id: AC-746
type: acceptance_criterion
title: optional eyebrow and cta render when supplied and are omitted when absent
created_by: xgd
created_at: '2026-06-29T23:13:17.255961+00:00'
updated_at: '2026-06-29T23:13:17.255961+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-c4943d39
  kind: behavior
  regression_only: false
---

## Criterion
When `eyebrow` and `cta` are both absent, the rendered section contains no eyebrow element and no call-to-action element. When both are supplied, the eyebrow text appears and the call-to-action appears as a link carrying the cta's label as its text and the cta's href as its destination.

## Verification
Render split-section without eyebrow/cta and assert neither the eyebrow nor the cta markers appear. Render with a well-formed eyebrow and cta {label, href} and assert the eyebrow text is shown and the cta link exposes the given label and href.
