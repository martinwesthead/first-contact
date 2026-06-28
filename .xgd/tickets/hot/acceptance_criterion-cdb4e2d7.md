---
uid: acceptance_criterion-cdb4e2d7
id: AC-633
type: acceptance_criterion
title: End-to-end single-page conversion yields a draft using source palette, type,
  R2 image and source text
created_by: xgd
created_at: '2026-06-28T20:11:29.063841+00:00'
updated_at: '2026-06-28T20:11:29.063841+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
For a confirmed conversion of a single-page source, the convert orchestration plus
the AI reconstruction loop together produce a working draft that: (a) has at least
one page; (b) applies theme tokens derived from the source's palette and
typography that differ from the framework defaults; (c) contains at least one
module whose image content resolves to an R2-mirrored asset key
(`/assets/sites/{siteId}/imports/…`), not the source's external URL; and (d)
contains at least one module whose text content includes content present in the
source.

## Verification
Run the convert orchestration against a single-page source fixture, then drive a
(mocked) chat loop that reads the digest and applies edits. Assert the resulting
draft has ≥1 page, theme tokens distinct from framework defaults, ≥1 module image
resolving to an R2-mirrored key, and ≥1 module text containing source content.
