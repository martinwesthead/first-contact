---
uid: capability-f22920ee
id: CAP-50
type: capability
title: Site Data Model & Persistence
created_by: xgd
created_at: '2026-06-29T21:27:35.919272+00:00'
updated_at: '2026-06-29T21:27:35.919272+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Site Data Model & Persistence
---

Persistent multi-site data model in D1: the accounts, sites, and revisions
tables plus the slug-allocation rules and the platform bootstrap seed.

Owns the draft/published site-definition lifecycle storage (one row per site
with separate draft and published definition payloads), per-publish revision
snapshots, account identity + plan tier, global slug namespace allocation
within *.1stcontact.io, and the one-time seed that brings the 1st Contact
marketing site under D1 management.

Distinct from CAP-32 (Site Definition Schema), which owns only the in-memory
Site contract and its validator. This capability owns where site definitions
are stored, how they are versioned, and how site slugs are allocated.
