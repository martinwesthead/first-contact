---
uid: request-e7328950
id: REQ-44
type: request
title: 'Module: services-grid@v2 (upgrade existing)'
created_by: xgd
created_at: '2026-06-20T21:15:17.398197+00:00'
updated_at: '2026-06-20T21:16:07.174010+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

The current `services-grid@v1` is text-only. This upgrade adds per-item images and a CTA, making it viable for real service showcases.

- **Variants:** `three-col`, `two-col`, `one-col` (add one-col for feature callouts)

- **Dials:** same as v1 plus:

- `imageStyle`: `icon`, `cover`, `thumb` (controls how the image is sized within the card)

- **Content fields:**

- `heading` — string

- `items[]` — array of:

- `image` — asset-ref (optional)

- `heading` — string

- `body` — markdown

- `cta` — `{ label, href }` (optional)