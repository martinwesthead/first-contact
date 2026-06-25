---
uid: capability-474ee896
id: CAP-36
type: capability
title: Public Site Delivery
created_by: xgd
created_at: '2026-06-25T01:34:06.589987+00:00'
updated_at: '2026-06-25T01:34:06.589987+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Public Site Delivery
---

The 1stcontact.io public-facing marketing site and the Worker that serves it.

Covers the published Phase 0 marketing site definition (content, theme, page structure, navigation), the Cloudflare Worker that delivers the pre-generated static output via Workers Static Assets, and the CI/deploy workflow ordering that keeps generated artifacts in lockstep with deploys.

Distinct from:
- Static Site Generator (CAP-35) — the reusable generator tool that produces the bundle.
- Platform Deployment Infrastructure (CAP-31) — the monorepo, Workers scaffolding, and CI/deploy plumbing in general.
