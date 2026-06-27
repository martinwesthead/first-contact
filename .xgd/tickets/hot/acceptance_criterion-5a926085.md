---
uid: acceptance_criterion-5a926085
id: AC-587
type: acceptance_criterion
title: Palette roles are inferred with a capped supporting list
created_by: xgd
created_at: '2026-06-27T01:10:15.615958+00:00'
updated_at: '2026-06-27T01:10:15.615958+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document whose `<style>` blocks and/or inline `style` attributes declare colours, the digest's palette signal reports four named roles — `background`, `body`, `accent`, `cta` — plus a `supporting` list of distinct colours not already used by a role, capped at 6 entries. Role inference follows the documented heuristic (background = colour declared on body/html/:root; body = text colour on those selectors; accent = heading text colour distinct from body; cta = background colour on button/.cta/.btn-style selectors). When a role cannot be inferred from the markup it is reported as the literal string `not_detected` and any unattributed colour falls into `supporting`.

## Verification
Run the palette extraction against fixtures: (a) a page declaring all four role colours plus several extras → assert each role holds the declared colour and `supporting` lists the extras with at most 6 entries; (b) a page with no colour declarations → assert all four roles equal `not_detected` and `supporting` is empty.
