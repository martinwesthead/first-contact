---
uid: capability-60a035e7
id: CAP-45
type: capability
title: Asset Storage
created_by: xgd
created_at: '2026-06-27T00:45:34.560386+00:00'
updated_at: '2026-06-27T00:45:34.560386+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: asset_storage
---

HTTP-accessible binary asset storage for site assets (operator-uploaded images, captured screenshots, design references, customer-site media).

Foundation plumbing depended on by downstream features that need to persist or read binary assets: reference-digest screenshot capture, browser-rendering screenshots, asset transcription, and the assets-tab editor.

Single shared bucket in v1; per-customer-site isolation is deferred until authentication lands.
