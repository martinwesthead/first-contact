---
uid: acceptance_criterion-416da0d0
id: AC-790
type: acceptance_criterion
title: Rendered fetch records key-region layout bounding boxes
created_by: xgd
created_at: '2026-06-30T01:26:49.187680+00:00'
updated_at: '2026-06-30T01:26:49.187680+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
When the rendered fetch runs, the digest's `layout` signal exposes a `boundingBoxes` structure giving the on-page rectangle (`x`, `y`, `width`, `height`, in CSS pixels and including scroll offset) for the hero region, the nav region, every `section`, and every card. `sections` and `cards` are always arrays (possibly empty); `hero` and `nav` are present only when a matching element with a non-zero layout box is found. Elements with zero width/height or no layout box are omitted. The existing layout fields (`maxContentWidth`, `bias`, `density`) are preserved unchanged alongside `boundingBoxes`. A static-only digest leaves `layout.boundingBoxes` unset.

## Verification
Merge rendered bounding boxes for a page with a hero, a nav, two non-empty sections, one card, and one zero-area section → assert `layout.boundingBoxes.hero` and `.nav` carry the expected rects, `.sections` lists the two non-empty section rects (the zero-area one omitted), `.cards` lists the one card, and `maxContentWidth`/`bias`/`density` are unchanged. Merge with no bounding boxes (static path) → assert `layout.boundingBoxes` is unset.
