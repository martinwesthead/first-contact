---
uid: acceptance_criterion-773c7618
id: AC-778
type: acceptance_criterion
title: Convert-flow LLM context documents the services-grid item shape and imageStyle
  dial
created_by: xgd
created_at: '2026-06-30T00:52:06.875877+00:00'
updated_at: '2026-06-30T00:52:06.875877+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The convert-flow LLM-context documentation — both the canonical how-to document and its byte-for-byte inlined runtime mirror — documents the services-grid item shape (`{ heading, body, image?, cta? }`), states that the optional `image` is an asset-ref object with no string fallback, and explains the section-level `imageStyle` dial (`icon`/`cover`/`thumb`) and the `one-col` variant for a single full-width feature callout. The two copies stay in sync.

## Verification

Assert that both the convert-flow how-to document and its inlined runtime mirror contain guidance naming the services-grid item fields `{ heading, body, image?, cta? }`, note the asset-ref-only image (no string fallback), and describe the `imageStyle` dial values and the `one-col` variant; assert the two copies carry the same guidance text.
