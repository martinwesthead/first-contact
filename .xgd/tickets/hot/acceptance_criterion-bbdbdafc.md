---
uid: acceptance_criterion-bbdbdafc
id: AC-634
type: acceptance_criterion
title: End-to-end multi-page conversion yields a draft with multiple distinct pages
  and no page cap
created_by: xgd
created_at: '2026-06-28T20:11:32.076272+00:00'
updated_at: '2026-06-28T20:11:32.076272+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
For a source whose home page links to additional same-origin pages that have
already been analyzed, the persisted per-page plan contains multiple entries with
distinct slugs, and the AI reconstruction loop produces a working draft with
multiple distinct pages (at least the number of discovered pages). The page count
is not capped — the discovered cardinality is illustrative, not a maximum.

## Verification
Analyze a multi-page same-origin source, convert it, and assert the per-page plan
has multiple distinct-slug entries. Drive a (mocked) chat loop that adds a page
per non-home plan entry and assert the resulting draft has ≥ the discovered number
of pages, all with distinct slugs.
