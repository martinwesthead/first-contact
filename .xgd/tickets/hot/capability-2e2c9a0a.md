---
uid: capability-2e2c9a0a
id: CAP-52
type: capability
title: Builder AI Developer Tools
created_by: xgd
created_at: '2026-06-30T01:09:37.537623+00:00'
updated_at: '2026-06-30T01:09:37.537623+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: builder_ai_dev_tools
---

Developer-only tooling exposed to the builder chat AI, gated off entirely in production. These capabilities let the developer operating the 1st Contact builder drive local development workflows (e.g. project ticketing) through the chat AI, without ever surfacing to end-user/customer chat sessions. Distinct from the customer-facing Operator API capability: these tools are visible only when an explicit dev-tools environment flag is set, and several reach local-machine sidecars that production deployments cannot contact.
