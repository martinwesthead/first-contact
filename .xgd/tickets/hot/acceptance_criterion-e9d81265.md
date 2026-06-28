---
uid: acceptance_criterion-e9d81265
id: AC-704
type: acceptance_criterion
title: Reproduction how-to instructs the precomputed AssetRef object for image fields
created_by: xgd
created_at: '2026-06-28T23:40:46.997426+00:00'
updated_at: '2026-06-28T23:40:46.997426+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
The convert-flow reproduction guidance the AI is given — `docs/llm-context/reproducing-a-website.md` and its inlined mirror in `apps/control-app/src/llm-context.ts` — instructs the AI to set an image content field to the matching inventory entry's precomputed `assetRef` **object**, and includes a worked example of the object shape. It explicitly states that a bare path string (e.g. `/assets/{r2Key}`) is rejected by the framework's asset-ref validator and renders an empty image, so the object must be passed instead. Neither document instructs passing a bare image path string.

## Verification
Read both guidance artifacts. Assert each contains the precomputed-`assetRef` instruction for image fields, a worked example matching the `{ id, src, alt }` AssetRef shape, and the warning that a bare path string is rejected. Assert neither instructs setting an image field to a bare `/assets/{r2Key}` string.
