---
uid: acceptance_criterion-169d439b
id: AC-588
type: acceptance_criterion
title: Typography signals report declared font styles and a primary pair
created_by: xgd
created_at: '2026-06-27T01:10:20.016005+00:00'
updated_at: '2026-06-27T01:10:20.016005+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document declaring font properties on body/html and on h1/h2/h3 (via `<style>` rules, inline styles, or the `font` shorthand), the digest's typography signal reports `family`, `size`, and `weight` for each of body, h1, h2, and h3, using the declared values and serialising any undeclared property as `not_detected`. When both a body font family and at least one heading font family are declared, the digest reports a `primaryPair` of `{ heading, body }`; otherwise `primaryPair` is `not_detected`.

## Verification
Run typography extraction against: (a) a page declaring body and heading font-family/size/weight → assert each field carries the declared value and `primaryPair` names the heading and body families; (b) a page with no font declarations → assert every field and `primaryPair` is `not_detected`.
