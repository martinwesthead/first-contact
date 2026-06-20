---
uid: request-e220320e
id: REQ-42
type: request
title: Module:banner@v1
created_by: xgd
created_at: '2026-06-20T21:13:40.699509+00:00'
updated_at: '2026-06-20T21:14:20.334353+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

A full-width strip with a bold statement and optional CTA. Used for announcements, section dividers, or calls to action between content sections.

- **Variants:** `simple`, `with-cta`

- **Dials:**

- `size`: `sm`, `md`, `lg`

- `align`: `left`, `center`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- **Content fields:**

- `eyebrow` — string (optional)

- `heading` — string

- `subhead` — string (optional)

- `cta` — `{ label, href }` (optional)