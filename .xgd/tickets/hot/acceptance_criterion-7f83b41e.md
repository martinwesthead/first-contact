---
uid: acceptance_criterion-7f83b41e
id: AC-432
type: acceptance_criterion
title: Services-grid content with fewer than 2 or more than 6 items is rejected with
  a violation identifying the items field
created_by: xgd
created_at: '2026-06-25T01:11:43.817480+00:00'
updated_at: '2026-06-30T00:51:39.593401+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

When services-grid content is validated, an `items` array with fewer than 1 entry (an empty array) or more than 6 entries is rejected. The resulting violation identifies the `items` field and indicates the cardinality bound that was exceeded. A single item is accepted (one-col feature callouts allow one item).

## Verification

Validate services-grid content with 0 items (an empty `items` array): expect a rejection whose violation path identifies the `items` field and whose message indicates the minimum-of-1 bound. Validate services-grid content with 7 items: expect a rejection whose violation path identifies the `items` field and whose message indicates the maximum-of-6 bound. Validate with 1, 3, and 6 items: expect acceptance.
