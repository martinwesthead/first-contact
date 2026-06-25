---
uid: capability-79556c4b
id: CAP-37
type: capability
title: Lead Capture & CRM Lite
created_by: xgd
created_at: '2026-06-25T01:45:52.325653+00:00'
updated_at: '2026-06-25T01:45:52.325653+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: Lead Capture & CRM Lite
---

End-to-end intake of contact-form submissions from published 1st Contact sites into the lead database, with spam protection (honeypot + Cloudflare Turnstile) and best-effort owner notification.

Covers the `leads` data contract (schema shaped for the full CRM Lite lifecycle), the public-site Worker endpoint that records submissions, the framework-level Turnstile widget loading on pages containing a contact-form module, and the progressive-enhancement client island that attaches the Turnstile token to JSON submissions.

This capability is the data foundation for future CRM Lite UI (lead inbox, status transitions, follow-ups, conversation log, quotes, invoices). The schema deliberately includes columns and a status enum the CRM Lite UI will need, so subsequent stories do not require migrations.

Distinct from:
- Public Site Delivery (CAP-36) — that capability serves the static marketing site; this capability owns the dynamic form-handling endpoint and the lead data contract.
- Framework Module Catalog (CAP-34) — that capability owns the static structure of the contact-form module (fields, honeypot mount, Turnstile target). This capability owns the runtime behaviour: token verification, persistence, notification, and client-side token attachment.
