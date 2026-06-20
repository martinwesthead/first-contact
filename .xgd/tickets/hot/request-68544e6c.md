---
uid: request-68544e6c
id: REQ-41
type: request
title: 'Module: image-gallery@v1'
created_by: xgd
created_at: '2026-06-20T21:12:40.973991+00:00'
updated_at: '2026-06-20T21:13:21.435256+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

A grid of photos. Used for food photography, portfolio, before/after etc.

- **Variants:** `grid`, `masonry`

- **Dials:**

- `columns`: `2`, `3`, `4`

- `gap`: `tight`, `normal`, `loose`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse`

- **Content fields:**

- `heading` — string (optional)

- `items[]` — array of:

- `image` — asset-ref

- `caption` — string (optional)