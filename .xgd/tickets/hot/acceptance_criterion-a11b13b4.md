---
uid: acceptance_criterion-a11b13b4
id: AC-698
type: acceptance_criterion
title: Convert clears the draft to a 1-page empty scaffold before mirror/digest
created_by: xgd
created_at: '2026-06-28T23:09:39.539547+00:00'
updated_at: '2026-06-28T23:09:39.539547+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Before any mirror or digest work, a convert clears the operator's draft to a minimal
empty scaffold: exactly one home page at slug `/`, framework-default theme tokens,
an `in-page-anchors` nav pattern with no entries, no modules, and
`config.businessName` seeded from the source site title (its top heading, else a
title derived from the URL, else `"Untitled"`). The scaffold is a valid site
definition (passes site validation) and the home page title equals the seeded
business name.

## Verification
Convert an analyzed URL whose source has a recognizable title and assert the cleared
scaffold returned by the flow has one home page (slug `/`), default theme tokens, an
empty `in-page-anchors` nav, zero modules, and `config.businessName` equal to the
source title; assert it passes site validation. Convert an analyzed URL with no
derivable title and assert `config.businessName` is `"Untitled"`.
