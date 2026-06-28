---
uid: acceptance_criterion-4be5b826
id: AC-640
type: acceptance_criterion
title: Asset inventory references content-addressed hosted keys, deduped across pages
created_by: xgd
created_at: '2026-06-28T20:29:49.321174+00:00'
updated_at: '2026-06-28T20:29:49.321174+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
Every entry in the blueprint's asset inventory carries the source URL, the asset kind (image, background, or video), and a non-empty platform-hosted key of the form `sites/{siteId}/imports/{hash}.{ext}`, where the extension reflects the asset's content type. The same source URL referenced on multiple pages appears once in the inventory (deduped), pointing at a single hosted key.

## Verification
Produce a blueprint for a source with multiple images (including one image referenced from two pages); assert each inventory entry's hosted key matches the `sites/{siteId}/imports/{hash}.{ext}` pattern with a correct extension, the kind is one of image/background/video, and the duplicated URL yields exactly one inventory entry and one hosted key.
