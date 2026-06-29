---
uid: acceptance_criterion-40742cd2
id: AC-771
type: acceptance_criterion
title: Generated stylesheet emits an fc-contrast-warning comment plus one console
  warning per failing surface, leaving the :root block unchanged
created_by: xgd
created_at: '2026-06-29T23:53:48.323832+00:00'
updated_at: '2026-06-29T23:53:48.323832+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

**The generated stylesheet carries an fc-contrast-warning comment and a single console warning for each failing surface, without altering the :root block.**

When the merged palette contains one or more surface pairs below their
WCAG-AA threshold, the published theme-to-CSS generator prepends — ahead of
the `:root` block — one
`/* fc-contrast-warning: <surface> surface — <fg> on <bg> = <ratio>:1
(below WCAG AA <threshold>:1) */` comment per failing pair, and logs a
single `console.warn` naming all failing surfaces. The palette is rendered
exactly as supplied: the `:root` custom-property block is unchanged, and the
warnings are advisory (no blocking, no auto-correction). A palette in which
every surface pair passes produces no `fc-contrast-warning` comment and no
`console.warn`.

## Verification

Invoke the published theme-to-CSS generator with a clean palette and assert
the output contains no `fc-contrast-warning` comment and triggers no
`console.warn`. Invoke it with a palette whose `subtle` pair fails and assert
the output contains a `/* fc-contrast-warning: subtle ... */` comment while
still emitting the `:root` block (e.g. `--color-bg`). Invoke it with a
palette where both `subtle` and `accent` fail and assert both surfaces are
named (it does not stop at the first), and that exactly one `console.warn`
is logged naming the failing surfaces.
