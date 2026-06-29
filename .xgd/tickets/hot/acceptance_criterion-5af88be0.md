---
uid: acceptance_criterion-5af88be0
id: AC-741
type: acceptance_criterion
title: Reproduction how-to names image-gallery for sequential images and documents
  its items[] population
created_by: xgd
created_at: '2026-06-29T22:42:09.840546+00:00'
updated_at: '2026-06-29T22:42:09.840546+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
The convert-flow reproduction guidance the AI is given — `docs/llm-context/reproducing-a-website.md` and its byte-for-byte inlined mirror in `apps/control-app/src/llm-context.ts` — names `image-gallery` as the catalog target for sequential image content during visual-proximity matching (largest image → hero; sequential images → `image-gallery`; small square images → service icons), and documents that `image-gallery` populates its `items[]` one entry per asset, each entry being `{ image: <assetRef>, caption?: <string> }`, with captions pulled from `extractedContent` when present and otherwise left unset rather than fabricated.

## Verification
Read both guidance artifacts. Assert each names `image-gallery` for sequential image content and documents the per-asset `items[]` entry shape (an `image` AssetRef plus an optional `caption`). Assert the mention is present in both the canonical `.md` and the inlined mirror string so the hint cannot drift out of either silently.
