---
uid: acceptance_criterion-d0b282d0
id: AC-770
type: acceptance_criterion
title: Per-surface contrast evaluator scores default/subtle/inverse/accent pairs against
  their WCAG-AA thresholds
created_by: xgd
created_at: '2026-06-29T23:53:36.051496+00:00'
updated_at: '2026-06-29T23:53:36.051496+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

**The published per-surface contrast evaluator scores all four rendered surface pairs against their WCAG-AA threshold.**

Given a palette, the framework's published surface-contrast evaluator
returns exactly one scored pair per rendered surface, with the
foreground/background mapping that matches how each surface is painted:

- `default` — background `bg`, foreground `text`, threshold 4.5:1
- `subtle` — background `surfaceSubtle`, foreground `text`, threshold 4.5:1
- `inverse` — background `surfaceInverse`, foreground `bg`, threshold 4.5:1
- `accent` — background `accent`, foreground `bg`, threshold 3.0:1

Each pair reports its computed ratio and whether it meets (`pass`) or falls
below its threshold.

## Verification

Invoke the published surface-contrast evaluator with a palette and assert it
returns four pairs covering `default`, `subtle`, `inverse`, and `accent`,
each with the bg/fg roles listed above and threshold 4.5:1 for the three
body surfaces and 3.0:1 for `accent`. Assert a palette that pushes the
`subtle` pair below 4.5:1 marks that pair as failing while passing pairs are
marked passing.
