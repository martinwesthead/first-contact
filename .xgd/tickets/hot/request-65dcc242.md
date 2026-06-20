---
uid: request-65dcc242
id: REQ-43
type: request
title: Module:icon-row@v1
created_by: xgd
created_at: '2026-06-20T21:14:29.736465+00:00'
updated_at: '2026-06-20T21:14:58.567649+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

A horizontal strip of icons or logos with optional labels. Used for trust badges, "as seen in", certifications, or feature highlights with icons.

- **Variants:** `logos`, `features`

- **Dials:**

- `columns`: `3`, `4`, `5`, `6`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse`

- **Content fields:**

- `heading` — string (optional)

- `items[]` — array of:

- `image` — asset-ref (logo or icon)

- `label` — string (optional)

- `href` — string (optional link)