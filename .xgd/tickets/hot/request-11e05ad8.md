---
uid: request-11e05ad8
id: REQ-48
type: request
title: Text/Background Color Safety
created_by: xgd
created_at: '2026-06-20T22:50:45.359513+00:00'
updated_at: '2026-06-20T22:51:17.750900+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

**Type:** Framework + Instructions **Problem:** Transcribed theme tokens can produce unreadable text/background combinations (e.g. light text on light surface). **Framework fix:** Enforce minimum contrast ratios across all surface variants (`default`, `subtle`, `inverse`). Warn or auto-correct at render time. **Instructions fix:** After applying theme tokens during convert, AI should verify that text and background colors are legible across all surfaces and flag or correct low-contrast combinations.