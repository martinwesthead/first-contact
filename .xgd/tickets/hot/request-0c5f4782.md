---
uid: request-0c5f4782
id: REQ-39
type: request
title: 'Module: split-section@v1'
created_by: xgd
created_at: '2026-06-20T21:10:54.218719+00:00'
updated_at: '2026-06-20T21:11:35.115477+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

This is the single highest-value missing module. It's an image on one side, text on the other — used constantly on small business sites.

- **Variants:** `image-left`, `image-right`

- **Dials:**

- `size`: `sm`, `md`, `lg` (controls text size and section height)

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- `imageRatio`: `square`, `portrait`, `landscape` (controls the image column's aspect ratio)

- **Content fields:**

- `image` — asset-ref

- `eyebrow` — short string (optional label above heading)

- `heading` — string

- `body` — markdown

- `cta` — `{ label, href }` (optional)(new ticket)