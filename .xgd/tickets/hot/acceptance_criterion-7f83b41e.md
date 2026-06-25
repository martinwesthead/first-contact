---
uid: acceptance_criterion-7f83b41e
id: AC-432
type: acceptance_criterion
title: Services-grid content with fewer than 2 or more than 6 items is rejected with
  a violation identifying the items field
created_by: xgd
created_at: '2026-06-25T01:11:43.817480+00:00'
updated_at: '2026-06-25T01:11:43.817480+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When services-grid content is validated, an items array with fewer than 2 entries or more than 6 entries is rejected. The resulting violation identifies the `items` field and indicates the cardinality bound that was exceeded.

## Verification

Validate services-grid content with 1 item: expect a rejection whose violation path identifies the `items` field and whose message indicates the minimum-of-2 bound. Validate services-grid content with 7 items: expect a rejection whose violation path identifies the `items` field and whose message indicates the maximum-of-6 bound. Validate with 2, 3, and 6 items: expect acceptance.
