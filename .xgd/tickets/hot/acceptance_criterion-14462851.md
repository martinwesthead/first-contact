---
uid: acceptance_criterion-14462851
id: AC-684
type: acceptance_criterion
title: Asset reference carries an image/text kind, defaulting to image
created_by: xgd
created_at: '2026-06-28T22:54:26.933998+00:00'
updated_at: '2026-06-28T22:54:26.933998+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
An asset reference validates with an optional kind of `image` or `text`. When kind is absent it is treated as `image` (preserving every existing image reference unchanged). A `text` reference requires a non-empty source key and treats alt text as optional fallback; image-specific positioning data is not required on a text reference.

## Verification
Validate three asset references against the site schema: (a) a reference with no kind and an image source resolves/validates as an image reference; (b) a reference explicitly marked `text` with a non-empty source validates; (c) the discriminator rejects an unknown kind value. Assert each validation outcome.