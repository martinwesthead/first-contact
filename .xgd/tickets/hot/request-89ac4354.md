---
uid: request-89ac4354
id: REQ-47
type: request
title: Image Sizing & Controls
created_by: xgd
created_at: '2026-06-20T22:50:00.074796+00:00'
updated_at: '2026-06-20T22:50:54.291604+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

> **Type:** Framework + Instructions **Problem:** Images render at native resolution with no constraints, causing oversized images in hero and grid modules. **Framework fix:** Modules with image fields should constrain images by default (e.g. `object-fit: cover`, max dimensions per module type). Optionally expose an `imageSize` dial (e.g. `cover`, `contain`, `sm`, `md`, `lg`) so the AI can make intentional choices. **Instructions fix:** During convert, AI should match image sizing intent from the source site when an `imageSize` dial is available.

---