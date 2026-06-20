---
uid: request-c8ca3cbc
id: REQ-40
type: request
title: 'Module: testimonials@v1'
created_by: xgd
created_at: '2026-06-20T21:12:02.247298+00:00'
updated_at: '2026-06-20T21:12:28.714952+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

Single quotes or a carousel of client quotes. Very common on service businesses.

- **Variants:** `single`, `grid`

- **Dials:**

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- `align`: `left`, `center`

- **Content fields:**

- `heading` — string (optional section heading e.g. "What clients say")

- `items[]` — array of:

- `quote` — markdown

- `name` — string

- `title` — string (optional, e.g. "Mother of two")

- `avatar` — asset-ref (optional)