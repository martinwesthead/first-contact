---
uid: report-88cf4219
id: REPORT-590
type: report
title: 'Overlap resolution: cluster 3'
created_by: xgd
created_at: '2026-06-27T00:34:50.480181+00:00'
updated_at: '2026-06-27T00:34:50.480181+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: overlap_resolution
  subject_uid: report-cda4212b
  cluster_id: '3'
---

## Cluster 3 Resolution

**Boundary**: Form-submission endpoint: public-site Worker route vs lead-capture handler
**Stories resolved**: 2

### Actions

| Story | Action | From | To | Rationale |
|-------|--------|------|-----|-----------|
| story-f632db8a (STORY-44) | confirm | capability-474ee896 (CAP-36 Public Site Delivery) | (no change) | All 8 ACs cover static delivery only: marketing site definition, GET/HEAD via Workers Static Assets binding, 404 fallback for unknown paths, and CI/deploy generate-then-deploy ordering. No form-submission ACs. Belongs in Public Site Delivery. |
| story-37572647 (STORY-45) | confirm | capability-79556c4b (CAP-37 Lead Capture & CRM Lite) | (no change) | All 13 ACs cover the dynamic form pipeline: leads migration, POST /api/forms/contact, Turnstile verification + script injection, honeypot drop, validation errors, ip_country from CF header, extra_fields JSON, best-effort notification, and client-side token attachment. Belongs in Lead Capture & CRM Lite. |

### Why the overlap is acceptable

The two stories share a single physical Cloudflare Worker process but address two distinct capabilities. The capability bodies explicitly document this split: CAP-37's body cross-references CAP-36 with the exact boundary the survey raised — "Public Site Delivery (CAP-36) — that capability serves the static marketing site; this capability owns the dynamic form-handling endpoint and the lead data contract."

Concretely:

- **CAP-36 (STORY-44)** owns the route surface for static delivery: GET/HEAD → ASSETS binding, unknown paths → 404, plus the generate-before-deploy plumbing that keeps served artifacts in lockstep with the site definition.
- **CAP-37 (STORY-45)** owns the route surface for dynamic form handling: POST /api/forms/contact → validate → Turnstile verify → persist lead → notify owner, plus the framework-level Turnstile injection and client island that feed it.

There is no AC overlap between the two stories. The "Worker route" each story owns is disjoint (GET/HEAD vs POST, static asset paths vs /api/forms/contact). No reassignment, merge, or AC migration is needed.
