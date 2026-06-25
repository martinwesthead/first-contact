---
uid: acceptance_criterion-ee9b64d8
id: AC-394
type: acceptance_criterion
title: Nav pattern outside the enum is rejected
created_by: xgd
created_at: '2026-06-25T00:38:43.495569+00:00'
updated_at: '2026-06-25T00:38:43.495569+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

`NavConfig.pattern` must be one of the five named values:
`in-page-anchors`, `top-tabs`, `top-tabs-dropdown`, `hamburger`,
`footer-only`. Any other value causes `validateSite()` to return
the failure branch with an error whose JSON-pointer path locates
the `pattern` field (e.g. `/nav/pattern`).

## Verification

Set `nav.pattern` to a value outside the allowed enum on an
otherwise valid site, call `validateSite()`, and assert the
failure branch is returned and the error list contains an entry
pointing at the nav pattern field.
