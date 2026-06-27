---
uid: report-c36f893d
id: REPORT-587
type: report
title: 'Overlap resolution: cluster 1'
created_by: xgd
created_at: '2026-06-27T00:30:50.848894+00:00'
updated_at: '2026-06-27T00:30:50.848894+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: overlap_resolution
  subject_uid: report-cda4212b
  cluster_id: '1'
---

## Cluster 1 Resolution

**Boundary**: Contact-form ownership: form module surface vs lead-capture submission pipeline
**Capabilities involved**: CAP-34 (Framework Module Catalog) and CAP-37 (Lead Capture & CRM Lite)
**Stories resolved**: 2

### Decision: Confirm — no changes

The overlap is acceptable. Both stories touch the contact-form module, but they own
distinct layers of behaviour that CAP-37's body text already carves out explicitly:

> *CAP-37 distinct from: Framework Module Catalog (CAP-34) — that capability owns the
> static structure of the contact-form module (fields, honeypot mount, Turnstile target).
> This capability owns the runtime behaviour: token verification, persistence,
> notification, and client-side token attachment.*

The ACs partition cleanly along that line.

### Actions

| Story | Action | From | To | Rationale |
|-------|--------|------|-----|-----------|
| story-f1e061ba (STORY-42) | confirm | capability-3630a42c (CAP-34) | (no change) | Owns the module-level surface contract: static markup (AC-433/434/435/436), no-JS fallback (AC-437), and the module's generic progressive-enhancement client-island contract — intercept-submit / post-JSON / handle-2xx-and-error (AC-438/439/440). These behaviours are part of the module's own contract independent of which endpoint it targets, and properly live in the Framework Module Catalog. |
| story-37572647 (STORY-45) | confirm | capability-79556c4b (CAP-37) | (no change) | Owns the contact-form-specific lead-capture pipeline: leads schema (AC-464), endpoint persistence + validation (AC-465-470), spam protection (AC-466), Turnstile server-side verification (AC-471), provenance population (AC-472/473), best-effort notification (AC-474), framework-level Turnstile script injection (AC-475), and client-island Turnstile-token attachment (AC-476). All of these are runtime behaviours specific to the lead-capture flow, matching CAP-37's declared scope. |

### Why this is not a problem

The two stories share a *subject* (the contact-form module) but not a *behaviour*.
STORY-42's contact-form ACs describe what the module renders and how its
progressive-enhancement contract behaves at the module-contract layer. STORY-45's
ACs describe what happens when a submission lands at the Worker endpoint, how the
lead is persisted, and the Turnstile/notification wiring that is specific to
lead capture — none of which is part of the generic module contract.

There is no AC pair that describes the same behaviour from both stories; each AC has
a single, unambiguous owner. No reassignment, merge, or AC migration is required.
