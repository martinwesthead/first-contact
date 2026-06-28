---
uid: acceptance_criterion-1273f757
id: AC-703
type: acceptance_criterion
title: Digest asset inventory entries carry a precomputed image AssetRef
created_by: xgd
created_at: '2026-06-28T23:40:44.452177+00:00'
updated_at: '2026-06-28T23:40:44.452177+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
Every entry in the blueprint's asset inventory carries a precomputed image AssetRef object alongside its source URL, kind, and hosted key. The AssetRef has `id` equal to the entry's platform-hosted key, `src` equal to `/assets/<hosted-key>`, and `alt` equal to the asset's alt text (or an empty string when none was captured). The object is shaped so it validates against the framework's image AssetRef contract and can be used verbatim as the value of an image content field.

## Verification
Produce a blueprint for a source with at least one image (one with alt text, one without). Assert each inventory entry exposes an `assetRef` whose `id` equals the entry's hosted key, whose `src` equals `/assets/` + that hosted key, and whose `alt` is the captured alt text or `""`. Assert the object validates against the image AssetRef schema (`id`/`src`/`alt` all present, `id` and `src` non-empty).
