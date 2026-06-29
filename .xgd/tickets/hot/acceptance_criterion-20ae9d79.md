---
uid: acceptance_criterion-20ae9d79
id: AC-767
type: acceptance_criterion
title: logo-strip wraps an item with an href in an anchor, marking external links
  safe
created_by: xgd
created_at: '2026-06-29T23:45:10.329775+00:00'
updated_at: '2026-06-29T23:45:10.329775+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-24c2b820
  kind: behavior
  regression_only: false
---

## Criterion
Item linking is driven by the `href` field:
- When an item has an `href`, the rendered item is wrapped in an `<a>` element whose href is that value (the image, and label when shown, sit inside the anchor).
- When an item's `href` points to an external destination (begins with `http://`, `https://`, or a protocol-relative `//`), the anchor carries `target="_blank"` and `rel="noopener noreferrer"`.
- When an item has no `href`, the item is rendered as a non-link container (no `<a>` wrapping it).

## Verification
Render an item with an internal `href` and assert it is wrapped in an `<a>` with the matching href and no `target`/`rel` new-tab attributes. Render an item with an external `href` and assert the `<a>` carries `target="_blank"` and `rel="noopener noreferrer"`. Render an item with no `href` and assert no anchor wraps it.
