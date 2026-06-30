---
uid: acceptance_criterion-ae5a4d40
id: AC-774
type: acceptance_criterion
title: Convert-flow LLM context documents the image-gallery imageSize dial
created_by: xgd
created_at: '2026-06-30T00:02:53.868831+00:00'
updated_at: '2026-06-30T00:02:53.868831+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

The convert-flow LLM context documentation describes the image-gallery `imageSize` dial, names its values (`sm`, `md`, `lg`), and instructs the convert step to set the dial to match how prominent images appear in the source site. The instruction surface is kept consistent across its two copies: the canonical how-to document and the byte-for-byte inlined mirror consumed at runtime both mention the dial.

## Verification

Assert the canonical convert-flow how-to documentation mentions `imageSize` in the context of `image-gallery` and spells out the `sm`/`md`/`lg` values. Assert the inlined mirror string consumed at runtime also mentions `imageSize`, confirming the two copies stay in sync.
